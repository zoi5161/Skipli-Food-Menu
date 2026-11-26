"use server";

// Các thao tác sửa menu. Mọi hàm đều:
// 1) kiểm tra đăng nhập và lấy quán của người đó (không tin restaurantId gửi từ trình duyệt),
// 2) chỉ sửa dữ liệu thuộc quán đó,
// 3) xóa bản lưu đệm của trang khách và làm mới màn hình (expireRestaurantCache).

import { after } from "next/server";
import { expireRestaurantCache } from "@/lib/menu/expire";
import { takeSnapshot, replaceMenu } from "@/lib/menu/history";
import { removeJobFile } from "@/lib/menu/jobs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { DIETARY_TAGS, MAX_VARIANTS, parsePriceInput } from "@/lib/menu/format";

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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
  isFeatured: z.boolean().default(false),
  // Giá theo cỡ: để trống = một giá (dùng "price"); có thì cần 2–6 cỡ, mỗi cỡ có tên và giá
  variants: z
    .array(z.object({ name: z.string().trim().min(1, "Each size needs a name").max(30, "Size names: keep them under 30 characters"), price: z.string().max(20) }))
    .max(MAX_VARIANTS, `Up to ${MAX_VARIANTS} sizes per item`)
    .default([]),
});

export async function saveItem(input: z.input<typeof itemInput>): Promise<ActionResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = itemInput.parse(input);
    if (data.variants.length === 1) throw new Error("USER:Add at least 2 sizes, or remove sizes and use one price");
    if (new Set(data.variants.map((v) => v.name.toLowerCase())).size !== data.variants.length) throw new Error("USER:Each size needs a different name");
    const variants = data.variants.map((v, position) => {
      const cents = priceOrThrow(v.price);
      if (cents === null) throw new Error(`USER:Enter a price for “${v.name}”`);
      return { name: v.name, priceCents: cents, position };
    });
    // Có cỡ thì giá chính = giá thấp nhất (dùng cho "from $x")
    const priceCents = variants.length ? Math.min(...variants.map((v) => v.priceCents)) : priceOrThrow(data.price);
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
      isFeatured: data.isFeatured,
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
        db.itemVariant.deleteMany({ where: { itemId: data.id } }),
        db.itemVariant.createMany({ data: variants.map((v) => ({ ...v, itemId: data.id! })) }),
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
          variants: { create: variants },
        },
      });
      savedId = created.id;
    }
    expireRestaurantCache(restaurant);
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
    if (await db.itemVariant.count({ where: { itemId } })) throw new Error("USER:This item has sizes. Open it to change each price.");
    const priceCents = priceOrThrow(z.string().max(20).parse(price));
    await db.menuItem.update({ where: { id: itemId }, data: { priceCents } });
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
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
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ──────────────────── Nhập menu từ file / ảnh (sau khi xem lại) ────────────────────

// Một menu PDF nhiều trang có thể tới vài trăm món (AI đọc tối đa 400 món mỗi file).
const MAX_IMPORT_DISHES = 400;

const importInput = z.object({
  // "add": thêm vào menu đang có; "replace": thay cả menu (món trùng tên giữ ảnh, nhãn và lượt bấm)
  mode: z.enum(["add", "replace"]).default("add"),
  // File ở trang Bulk upload: đánh dấu đã thêm vào menu
  jobId: z.string().min(1).max(40).optional(),
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Each category needs a name").max(60),
        items: z
          .array(
            z.object({
              name: z.string().trim().min(1, "Each dish needs a name").max(120),
              description: z.string().trim().max(500).nullable(),
              priceCents: z.number().int().min(0).max(10_000_000).nullable(),
              variants: z
                .array(z.object({ name: z.string().trim().min(1).max(30), priceCents: z.number().int().min(0).max(10_000_000) }))
                .max(MAX_VARIANTS)
                .default([]),
            }),
          )
          .max(MAX_IMPORT_DISHES),
      }),
    )
    .max(60),
});

/**
 * Lưu các món AI đọc được (đã xem lại, sửa, bỏ món sai). Lưu bản menu cũ vào History trước.
 * - add: món vào danh mục cùng tên nếu đã có (không phân biệt hoa thường), nếu chưa thì tạo danh mục mới.
 * - replace: menu sau khi lưu đúng bằng danh sách này (xem replaceMenu).
 * Lưu tất cả trong một lần: lỗi thì không lưu món nào.
 */
export async function importMenu(input: z.input<typeof importInput>): Promise<ActionResult & { added?: number; newCategories?: number }> {
  try {
    const { restaurant, user } = await requireRestaurant();
    const data = importInput.parse(input);
    const total = data.categories.reduce((n, c) => n + c.items.length, 0);
    if (total === 0) throw new Error("USER:Choose at least one dish to add");
    if (total > MAX_IMPORT_DISHES) throw new Error(`USER:Add up to ${MAX_IMPORT_DISHES} dishes at a time`);
    if (data.jobId) {
      const job = await db.menuJob.findFirst({ where: { id: data.jobId, restaurantId: restaurant.id }, select: { status: true } });
      if (!job) throw new Error("USER:This upload was not found. Please reload the page.");
      if (job.status === "APPLIED") throw new Error("USER:This file was already added to the menu.");
    }

    const result = await db.$transaction(
      async (tx) => {
        await takeSnapshot(
          tx,
          restaurant.id,
          data.mode === "replace" ? "replace" : "import",
          data.mode === "replace" ? `Before replacing the menu with ${total} ${total === 1 ? "dish" : "dishes"} from a file` : `Before adding ${total} ${total === 1 ? "dish" : "dishes"} from a file`,
          user.email,
        );
        if (data.jobId) await tx.menuJob.update({ where: { id: data.jobId }, data: { status: "APPLIED" } });

        if (data.mode === "replace") {
          const before = await tx.category.count({ where: { restaurantId: restaurant.id } });
          await replaceMenu(tx, restaurant.id, { version: 1, categories: data.categories });
          return { added: total, newCategories: Math.max(0, data.categories.length - before) };
        }

        const existing = await tx.category.findMany({ where: { restaurantId: restaurant.id }, select: { id: true, name: true, position: true } });
        const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));
        let nextCatPos = existing.reduce((m, c) => Math.max(m, c.position), -1) + 1;
        let added = 0;
        let newCategories = 0;
        for (const cat of data.categories) {
          if (cat.items.length === 0) continue;
          let categoryId = byName.get(cat.name.toLowerCase());
          if (!categoryId) {
            categoryId = (await tx.category.create({ data: { restaurantId: restaurant.id, name: cat.name, position: nextCatPos++ } })).id;
            byName.set(cat.name.toLowerCase(), categoryId);
            newCategories++;
          }
          const last = await tx.menuItem.aggregate({ where: { categoryId }, _max: { position: true } });
          let pos = (last._max.position ?? -1) + 1;
          for (const it of cat.items) {
            // Cỡ: cần ít nhất 2; chỉ 1 cỡ thì coi như một giá
            const variants = it.variants.length >= 2 ? it.variants : [];
            const priceCents = variants.length ? Math.min(...variants.map((v) => v.priceCents)) : (it.variants[0]?.priceCents ?? it.priceCents);
            await tx.menuItem.create({
              data: {
                restaurantId: restaurant.id,
                categoryId,
                name: it.name,
                description: it.description || null,
                priceCents,
                position: pos++,
                variants: { create: variants.map((v, i) => ({ name: v.name, priceCents: v.priceCents, position: i })) },
              },
            });
            added++;
          }
        }
        return { added, newCategories };
      },
      { timeout: 60_000 }, // vài trăm món trên database ở xa có thể mất vài giây (mặc định chỉ chờ 5 giây)
    );
    if (data.jobId) after(() => removeJobFile(data.jobId!)); // file gốc không cần nữa
    expireRestaurantCache(restaurant);
    return { ok: true, ...result };
  } catch (e) {
    return fail(e);
  }
}
