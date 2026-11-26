import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { DIETARY_TAGS, type DietaryTagValue } from "./format";

// Lịch sử menu (tab History). Trước mỗi lần thêm món từ file, thay cả menu hoặc khôi phục,
// app lưu toàn bộ danh mục + món lúc đó vào MenuSnapshot để có thể quay lại.
//
// Thay cả menu / khôi phục KHÔNG xóa hết rồi tạo lại: món nào trùng tên (không phân biệt hoa thường)
// thì giữ nguyên dòng cũ và chỉ cập nhật, để số lượt bấm của món đó trên trang Stats không mất.

type Tx = Prisma.TransactionClient;

export type DocVariant = { name: string; priceCents: number };
export type DocItem = {
  name: string;
  description: string | null;
  priceCents: number | null;
  variants: DocVariant[];
  // Các trường dưới đây không có (undefined) thì giữ nguyên giá trị cũ của món trùng tên
  // (món mới thì dùng mặc định). Bản lưu lịch sử luôn có đủ.
  imageUrl?: string | null;
  isVisible?: boolean;
  isSoldOut?: boolean;
  isFeatured?: boolean;
  dietaryTags?: DietaryTagValue[];
  extras?: string[]; // tên món thêm
  allergens?: string[]; // tên chất gây dị ứng
};
export type DocCategory = {
  name: string;
  description?: string | null;
  isVisible?: boolean;
  servingDays?: number[];
  servingFrom?: string | null;
  servingUntil?: string | null;
  items: DocItem[];
};
export type MenuDoc = { version: 1; categories: DocCategory[] };

export const MAX_SNAPSHOTS = 30;
const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Toàn bộ menu hiện tại của quán, theo thứ tự đang hiện. */
export async function readMenuDoc(tx: Tx, restaurantId: string): Promise<MenuDoc> {
  const categories = await tx.category.findMany({
    where: { restaurantId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          variants: { orderBy: { position: "asc" }, select: { name: true, priceCents: true } },
          extras: { include: { extra: { select: { name: true } } } },
          allergens: { include: { allergen: { select: { name: true } } } },
        },
      },
    },
  });
  return {
    version: 1,
    categories: categories.map((c) => ({
      name: c.name,
      description: c.description,
      isVisible: c.isVisible,
      servingDays: c.servingDays,
      servingFrom: c.servingFrom,
      servingUntil: c.servingUntil,
      items: c.items.map((i) => ({
        name: i.name,
        description: i.description,
        priceCents: i.priceCents,
        variants: i.variants,
        imageUrl: i.imageUrl,
        isVisible: i.isVisible,
        isSoldOut: i.isSoldOut,
        isFeatured: i.isFeatured,
        dietaryTags: i.dietaryTags,
        extras: i.extras.map((e) => e.extra.name),
        allergens: i.allergens.map((a) => a.allergen.name),
      })),
    })),
  };
}

export const countDoc = (doc: MenuDoc) => ({ categoryCount: doc.categories.length, itemCount: doc.categories.reduce((n, c) => n + c.items.length, 0) });

/** Lưu menu hiện tại thành một bản lịch sử (bỏ qua khi menu đang trống), rồi chỉ giữ MAX_SNAPSHOTS bản mới nhất. */
export async function takeSnapshot(tx: Tx, restaurantId: string, reason: "import" | "replace" | "restore", note: string, byEmail: string | null) {
  const doc = await readMenuDoc(tx, restaurantId);
  const counts = countDoc(doc);
  if (counts.itemCount === 0 && counts.categoryCount === 0) return null;
  const snap = await tx.menuSnapshot.create({
    data: { restaurantId, reason, note, ...counts, data: doc as unknown as Prisma.InputJsonValue, createdByEmail: byEmail },
    select: { id: true },
  });
  const old = await tx.menuSnapshot.findMany({ where: { restaurantId }, orderBy: { createdAt: "desc" }, skip: MAX_SNAPSHOTS, select: { id: true } });
  if (old.length) await tx.menuSnapshot.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return snap.id;
}

/** Đọc lại `data` của bản lưu (dữ liệu JSON từ database): bỏ những gì không đúng dạng. */
export function parseMenuDoc(raw: unknown): MenuDoc {
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const strOrNull = (v: unknown, max: number) => (typeof v === "string" && v ? v.slice(0, max) : null);
  const cents = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10_000_000 ? v : null);
  const names = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 60)) : undefined);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : undefined);
  const cats = Array.isArray((raw as { categories?: unknown })?.categories) ? (raw as { categories: unknown[] }).categories : [];
  return {
    version: 1,
    categories: cats.flatMap((c): DocCategory[] => {
      const o = c as Record<string, unknown>;
      const name = str(o.name, 60).trim();
      if (!name) return [];
      const items = (Array.isArray(o.items) ? o.items : []).flatMap((it): DocItem[] => {
        const x = it as Record<string, unknown>;
        const itemName = str(x.name, 120).trim();
        if (!itemName) return [];
        return [
          {
            name: itemName,
            description: strOrNull(x.description, 500),
            priceCents: cents(x.priceCents),
            variants: (Array.isArray(x.variants) ? x.variants : []).flatMap((v) => {
              const p = cents((v as Record<string, unknown>).priceCents);
              const n = str((v as Record<string, unknown>).name, 30).trim();
              return n && p !== null ? [{ name: n, priceCents: p }] : [];
            }),
            imageUrl: x.imageUrl === undefined ? undefined : strOrNull(x.imageUrl, 1000),
            isVisible: bool(x.isVisible),
            isSoldOut: bool(x.isSoldOut),
            isFeatured: bool(x.isFeatured),
            dietaryTags: Array.isArray(x.dietaryTags) ? x.dietaryTags.filter((t): t is DietaryTagValue => (DIETARY_TAGS as readonly string[]).includes(t as string)) : undefined,
            extras: names(x.extras),
            allergens: names(x.allergens),
          },
        ];
      });
      return [
        {
          name,
          description: o.description === undefined ? undefined : strOrNull(o.description, 300),
          isVisible: bool(o.isVisible),
          servingDays: Array.isArray(o.servingDays) ? o.servingDays.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6) : undefined,
          servingFrom: o.servingFrom === undefined ? undefined : strOrNull(o.servingFrom, 5),
          servingUntil: o.servingUntil === undefined ? undefined : strOrNull(o.servingUntil, 5),
          items,
        },
      ];
    }),
  };
}

/**
 * Thay toàn bộ danh mục + món của quán bằng `doc`.
 * Danh mục / món trùng tên được giữ lại và cập nhật (món giữ số lượt bấm), phần không còn trong `doc` bị xóa.
 * Món thêm (extra) và chất gây dị ứng được nối theo tên; tên chưa có thì tạo mới.
 */
export async function replaceMenu(tx: Tx, restaurantId: string, doc: MenuDoc) {
  const [oldCats, oldItems, extras, allergens] = await Promise.all([
    tx.category.findMany({ where: { restaurantId }, select: { id: true, name: true } }),
    tx.menuItem.findMany({ where: { restaurantId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }),
    tx.extra.findMany({ where: { restaurantId }, select: { id: true, name: true, position: true } }),
    tx.allergen.findMany({ where: { restaurantId }, select: { id: true, name: true, position: true } }),
  ]);

  const extraId = new Map(extras.map((e) => [key(e.name), e.id]));
  const allergenId = new Map(allergens.map((a) => [key(a.name), a.id]));
  let extraPos = extras.reduce((m, e) => Math.max(m, e.position), -1) + 1;
  let allergenPos = allergens.reduce((m, a) => Math.max(m, a.position), -1) + 1;
  async function extraFor(name: string) {
    const k = key(name);
    let found = extraId.get(k);
    if (!found) {
      found = (await tx.extra.create({ data: { restaurantId, name: name.trim(), position: extraPos++ }, select: { id: true } })).id;
      extraId.set(k, found);
    }
    return found;
  }
  async function allergenFor(name: string) {
    const k = key(name);
    let found = allergenId.get(k);
    if (!found) {
      found = (await tx.allergen.create({ data: { restaurantId, name: name.trim(), position: allergenPos++ }, select: { id: true } })).id;
      allergenId.set(k, found);
    }
    return found;
  }

  // Món cũ theo tên (một tên có thể có nhiều món: lấy lần lượt)
  const freeItems = new Map<string, string[]>();
  for (const it of oldItems) (freeItems.get(key(it.name)) ?? freeItems.set(key(it.name), []).get(key(it.name))!).push(it.id);
  const freeCats = new Map<string, string[]>();
  for (const c of oldCats) (freeCats.get(key(c.name)) ?? freeCats.set(key(c.name), []).get(key(c.name))!).push(c.id);

  const keptCats = new Set<string>();
  const keptItems = new Set<string>();

  for (const [ci, cat] of doc.categories.entries()) {
    const catData = {
      name: cat.name,
      position: ci,
      ...(cat.description !== undefined ? { description: cat.description } : {}),
      ...(cat.isVisible !== undefined ? { isVisible: cat.isVisible } : {}),
      ...(cat.servingDays !== undefined ? { servingDays: cat.servingDays } : {}),
      ...(cat.servingFrom !== undefined ? { servingFrom: cat.servingFrom } : {}),
      ...(cat.servingUntil !== undefined ? { servingUntil: cat.servingUntil } : {}),
    };
    const reuse = freeCats.get(key(cat.name))?.shift();
    const categoryId = reuse
      ? (await tx.category.update({ where: { id: reuse }, data: catData, select: { id: true } })).id
      : (await tx.category.create({ data: { restaurantId, ...catData }, select: { id: true } })).id;
    keptCats.add(categoryId);

    for (const [ii, it] of cat.items.entries()) {
      const variants = it.variants.length >= 2 ? it.variants : [];
      const priceCents = variants.length ? Math.min(...variants.map((v) => v.priceCents)) : (it.variants[0]?.priceCents ?? it.priceCents);
      const data = {
        categoryId,
        name: it.name,
        description: it.description,
        priceCents,
        position: ii,
        ...(it.imageUrl !== undefined ? { imageUrl: it.imageUrl } : {}),
        ...(it.isVisible !== undefined ? { isVisible: it.isVisible } : {}),
        ...(it.isSoldOut !== undefined ? { isSoldOut: it.isSoldOut } : {}),
        ...(it.isFeatured !== undefined ? { isFeatured: it.isFeatured } : {}),
        ...(it.dietaryTags !== undefined ? { dietaryTags: it.dietaryTags } : {}),
      };
      const reuseItem = freeItems.get(key(it.name))?.shift();
      let itemId: string;
      if (reuseItem) {
        itemId = (await tx.menuItem.update({ where: { id: reuseItem }, data, select: { id: true } })).id;
        await tx.itemVariant.deleteMany({ where: { itemId } });
      } else {
        itemId = (await tx.menuItem.create({ data: { restaurantId, ...data }, select: { id: true } })).id;
      }
      keptItems.add(itemId);
      if (variants.length) await tx.itemVariant.createMany({ data: variants.map((v, i) => ({ itemId, name: v.name, priceCents: v.priceCents, position: i })) });
      if (it.extras !== undefined) {
        await tx.menuItemExtra.deleteMany({ where: { itemId } });
        const ids: string[] = [];
        for (const n of it.extras) ids.push(await extraFor(n)); // lần lượt, để tên lặp lại không tạo trùng
        ids.splice(0, ids.length, ...new Set(ids));
        if (ids.length) await tx.menuItemExtra.createMany({ data: ids.map((extraId) => ({ itemId, extraId })) });
      }
      if (it.allergens !== undefined) {
        await tx.menuItemAllergen.deleteMany({ where: { itemId } });
        const ids: string[] = [];
        for (const n of it.allergens) ids.push(await allergenFor(n));
        ids.splice(0, ids.length, ...new Set(ids));
        if (ids.length) await tx.menuItemAllergen.createMany({ data: ids.map((allergenId) => ({ itemId, allergenId })) });
      }
    }
  }

  // Ảnh của món bị xóa vẫn để trong kho: bản lưu lịch sử còn dùng tới khi khôi phục.
  await tx.menuItem.deleteMany({ where: { restaurantId, id: { notIn: [...keptItems] } } });
  await tx.category.deleteMany({ where: { restaurantId, id: { notIn: [...keptCats] } } });
}
