"use server";

// Các thao tác sửa menu. Mọi hàm đều:
// 1) kiểm tra đăng nhập và lấy quán của người đó (không tin restaurantId gửi từ trình duyệt),
// 2) chỉ sửa dữ liệu thuộc quán đó,
// 3) gọi refresh() để màn hình cập nhật.

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { DIETARY_TAGS, parsePriceInput } from "@/lib/menu/format";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  if (error instanceof Error && error.message.startsWith("USER:")) return { ok: false, error: error.message.slice(5) };
  throw error; // lỗi khác (ví dụ redirect khi hết phiên) để Next xử lý
}

const id = z.string().min(1).max(40);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 07:00")
  .nullable()
  .optional();

function priceOrThrow(raw: string | null | undefined): number | null {
  const parsed = parsePriceInput(raw ?? "");
  if (!parsed.ok) throw new Error(`USER:${parsed.error}`);
  return parsed.cents;
}

/** Kiểm tra mọi id đều thuộc quán; trả về danh sách id hợp lệ theo đúng thứ tự gửi lên. */
async function assertOwned(
  model: "category" | "menuItem" | "extra" | "allergen",
  restaurantId: string,
  ids: string[],
) {
  if (ids.length === 0) return;
  const where = { id: { in: ids }, restaurantId };
  const count =
    model === "category"
      ? await db.category.count({ where })
      : model === "menuItem"
        ? await db.menuItem.count({ where })
        : model === "extra"
          ? await db.extra.count({ where })
          : await db.allergen.count({ where });
  if (count !== new Set(ids).size) throw new Error("USER:Something changed. Please reload the page.");
}

// ───────────────────────────── Danh mục ─────────────────────────────

const categoryInput = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Category needs a name").max(60),
  description: optionalText(300),
  servingDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  servingFrom: clock,
  servingUntil: clock,
});

export async function saveCategory(input: z.input<typeof categoryInput>): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = categoryInput.parse(input);
    if (Boolean(data.servingFrom) !== Boolean(data.servingUntil)) {
      throw new Error("USER:Set both a start and an end time, or leave both empty");
    }
    const fields = {
      name: data.name,
      description: data.description ?? null,
      servingDays: [...new Set(data.servingDays)].sort(),
      servingFrom: data.servingFrom ?? null,
      servingUntil: data.servingUntil ?? null,
    };

    let savedId: string;
    if (data.id) {
      await assertOwned("category", restaurant.id, [data.id]);
      await db.category.update({ where: { id: data.id }, data: fields });
      savedId = data.id;
    } else {
      const last = await db.category.aggregate({ where: { restaurantId: restaurant.id }, _max: { position: true } });
      const created = await db.category.create({
        data: { ...fields, restaurantId: restaurant.id, position: (last._max.position ?? -1) + 1 },
      });
      savedId = created.id;
    }
    refresh();
    return { ok: true, id: savedId };
  } catch (e) {
    return fail(e);
  }
}

export async function setCategoryVisible(categoryId: string, isVisible: boolean): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("category", restaurant.id, [id.parse(categoryId)]);
    await db.category.update({ where: { id: categoryId }, data: { isVisible: z.boolean().parse(isVisible) } });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("category", restaurant.id, [id.parse(categoryId)]);
    await db.category.delete({ where: { id: categoryId } }); // món trong danh mục bị xóa theo
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────────── Món ─────────────────────────────

const itemInput = z.object({
  id: id.optional(),
  categoryId: id,
  name: z.string().trim().min(1, "Item needs a name").max(80),
  description: optionalText(500),
  price: z.string().max(20).nullable().optional(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).default([]),
  extraIds: z.array(id).max(100).default([]),
  allergenIds: z.array(id).max(100).default([]),
  isVisible: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
});

export async function saveItem(input: z.input<typeof itemInput>): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = itemInput.parse(input);
    const priceCents = priceOrThrow(data.price);
    const extraIds = [...new Set(data.extraIds)];
    const allergenIds = [...new Set(data.allergenIds)];
    await assertOwned("category", restaurant.id, [data.categoryId]);
    await assertOwned("extra", restaurant.id, extraIds);
    await assertOwned("allergen", restaurant.id, allergenIds);

    const fields = {
      name: data.name,
      description: data.description ?? null,
      priceCents,
      dietaryTags: [...new Set(data.dietaryTags)],
      isVisible: data.isVisible,
      isSoldOut: data.isSoldOut,
    };

    let savedId: string;
    if (data.id) {
      await assertOwned("menuItem", restaurant.id, [data.id]);
      const current = await db.menuItem.findUniqueOrThrow({ where: { id: data.id }, select: { categoryId: true } });
      const movedCategory = current.categoryId !== data.categoryId;
      const position = movedCategory ? await nextItemPosition(data.categoryId) : undefined;
      await db.$transaction([
        db.menuItem.update({
          where: { id: data.id },
          data: { ...fields, categoryId: data.categoryId, ...(position !== undefined ? { position } : {}) },
        }),
        db.menuItemExtra.deleteMany({ where: { itemId: data.id } }),
        db.menuItemAllergen.deleteMany({ where: { itemId: data.id } }),
        db.menuItemExtra.createMany({ data: extraIds.map((extraId) => ({ itemId: data.id!, extraId })) }),
        db.menuItemAllergen.createMany({ data: allergenIds.map((allergenId) => ({ itemId: data.id!, allergenId })) }),
      ]);
      savedId = data.id;
    } else {
      const created = await db.menuItem.create({
        data: {
          ...fields,
          restaurantId: restaurant.id,
          categoryId: data.categoryId,
          position: await nextItemPosition(data.categoryId),
          extras: { create: extraIds.map((extraId) => ({ extraId })) },
          allergens: { create: allergenIds.map((allergenId) => ({ allergenId })) },
        },
      });
      savedId = created.id;
    }
    refresh();
    return { ok: true, id: savedId };
  } catch (e) {
    return fail(e);
  }
}

async function nextItemPosition(categoryId: string) {
  const last = await db.menuItem.aggregate({ where: { categoryId }, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

/** Sửa nhanh giá ngay trong danh sách (dùng nhiều trên điện thoại). */
export async function setItemPrice(itemId: string, price: string): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("menuItem", restaurant.id, [id.parse(itemId)]);
    const priceCents = priceOrThrow(z.string().max(20).parse(price));
    await db.menuItem.update({ where: { id: itemId }, data: { priceCents } });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Bật/tắt "Hết món" hoặc ẩn/hiện món, một chạm. */
export async function setItemFlags(
  itemId: string,
  flags: { isSoldOut?: boolean; isVisible?: boolean },
): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("menuItem", restaurant.id, [id.parse(itemId)]);
    const data = z.object({ isSoldOut: z.boolean().optional(), isVisible: z.boolean().optional() }).parse(flags);
    await db.menuItem.update({ where: { id: itemId }, data });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("menuItem", restaurant.id, [id.parse(itemId)]);
    await db.menuItem.delete({ where: { id: itemId } });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────────── Extra ─────────────────────────────

const extraInput = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Extra needs a name").max(60),
  price: z.string().max(20),
});

export async function saveExtra(input: z.input<typeof extraInput>): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = extraInput.parse(input);
    const priceCents = priceOrThrow(data.price) ?? 0;
    let savedId: string;
    if (data.id) {
      await assertOwned("extra", restaurant.id, [data.id]);
      await db.extra.update({ where: { id: data.id }, data: { name: data.name, priceCents } });
      savedId = data.id;
    } else {
      const last = await db.extra.aggregate({ where: { restaurantId: restaurant.id }, _max: { position: true } });
      const created = await db.extra.create({
        data: { restaurantId: restaurant.id, name: data.name, priceCents, position: (last._max.position ?? -1) + 1 },
      });
      savedId = created.id;
    }
    refresh();
    return { ok: true, id: savedId };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteExtra(extraId: string): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("extra", restaurant.id, [id.parse(extraId)]);
    await db.extra.delete({ where: { id: extraId } });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────────── Dị ứng ─────────────────────────────

const allergenInput = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Allergen needs a name").max(60),
});

export async function saveAllergen(input: z.input<typeof allergenInput>): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = allergenInput.parse(input);
    let savedId: string;
    if (data.id) {
      await assertOwned("allergen", restaurant.id, [data.id]);
      await db.allergen.update({ where: { id: data.id }, data: { name: data.name } });
      savedId = data.id;
    } else {
      const last = await db.allergen.aggregate({ where: { restaurantId: restaurant.id }, _max: { position: true } });
      const created = await db.allergen.create({
        data: { restaurantId: restaurant.id, name: data.name, position: (last._max.position ?? -1) + 1 },
      });
      savedId = created.id;
    }
    refresh();
    return { ok: true, id: savedId };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAllergen(allergenId: string): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await assertOwned("allergen", restaurant.id, [id.parse(allergenId)]);
    await db.allergen.delete({ where: { id: allergenId } });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────────── Sắp xếp (kéo thả) ─────────────────────────────

const idList = z.array(id).min(1).max(500);

export async function reorder(
  kind: "category" | "extra" | "allergen" | "item",
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const ids = idList.parse(orderedIds);
    const model = kind === "item" ? "menuItem" : kind;
    await assertOwned(model, restaurant.id, ids);

    const updates = ids.map((rowId, position) => {
      const args = { where: { id: rowId }, data: { position } };
      switch (kind) {
        case "category":
          return db.category.update(args);
        case "extra":
          return db.extra.update(args);
        case "allergen":
          return db.allergen.update(args);
        case "item":
          return db.menuItem.update(args);
      }
    });
    await db.$transaction(updates);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
