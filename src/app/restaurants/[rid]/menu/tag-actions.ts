"use server";

// Nút "Suggest tags with AI" (tab Items): AI gợi ý nhãn chế độ ăn và chất gây dị ứng; nhân viên chọn rồi mới lưu.

import { z } from "zod";
import { TagError, suggestTags } from "@/lib/ai/menu-tags";
import { db } from "@/lib/db";
import { DIETARY_TAGS, type DietaryTagValue } from "@/lib/menu/format";
import { expireRestaurantCache } from "@/lib/menu/expire";
import { requireRestaurant } from "@/lib/restaurant";

const TAG_RUNS_PER_DAY = 20;

export type TagRow = { itemId: string; name: string; category: string; tags: DietaryTagValue[]; allergens: string[] };

/** Gợi ý cho mọi món của quán; bỏ những nhãn món đã có. */
export async function suggestMenuTags(): Promise<{ ok: true; rows: TagRow[]; dishes: number } | { ok: false; error: string }> {
  const { restaurant } = await requireRestaurant();
  const runs = await db.aiMenuRead.count({ where: { restaurantId: restaurant.id, engine: "tags", createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (runs >= TAG_RUNS_PER_DAY) return { ok: false, error: `You can ask for tag suggestions up to ${TAG_RUNS_PER_DAY} times a day. Please try again tomorrow.` };

  const [items, allergens] = await Promise.all([
    db.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }],
      select: { id: true, name: true, description: true, dietaryTags: true, category: { select: { name: true } }, allergens: { select: { allergen: { select: { name: true } } } } },
    }),
    db.allergen.findMany({ where: { restaurantId: restaurant.id }, select: { name: true } }),
  ]);
  if (items.length === 0) return { ok: false, error: "Add some dishes first" };

  try {
    const { items: suggestions } = await suggestTags(
      items.map((i) => ({ id: i.id, name: i.name, description: i.description, category: i.category.name })),
      allergens.map((a) => a.name),
    );
    await db.aiMenuRead.create({ data: { restaurantId: restaurant.id, ok: true, engine: "tags", dishes: suggestions.length } });
    const byId = new Map(items.map((i) => [i.id, i]));
    const rows: TagRow[] = [];
    for (const s of suggestions) {
      const item = byId.get(s.id)!;
      const haveTags = new Set(item.dietaryTags);
      const haveAllergens = new Set(item.allergens.map((a) => a.allergen.name.toLowerCase()));
      const tags = s.tags.filter((t) => !haveTags.has(t));
      const newAllergens = s.allergens.filter((a) => !haveAllergens.has(a.toLowerCase()));
      if (tags.length || newAllergens.length) rows.push({ itemId: item.id, name: item.name, category: item.category.name, tags, allergens: newAllergens });
    }
    return { ok: true, rows, dishes: items.length };
  } catch (e) {
    if (e instanceof TagError) {
      if (e.reason === "no-key") return { ok: false, error: "AI isn't set up yet. Add tags by hand for now." };
      await db.aiMenuRead.create({ data: { restaurantId: restaurant.id, ok: false, engine: "tags" } });
      return { ok: false, error: "The AI is busy. Please try again in a minute." };
    }
    throw e;
  }
}

const applyInput = z
  .array(
    z.object({
      itemId: z.string().min(1).max(40),
      tags: z.array(z.enum(DIETARY_TAGS)).max(DIETARY_TAGS.length),
      allergens: z.array(z.string().trim().min(1).max(60)).max(20),
    }),
  )
  .min(1)
  .max(500);

/** Lưu các nhãn đã chọn: thêm vào nhãn món đang có (không xóa gì). Chất gây dị ứng chưa có thì tạo mới. */
export async function applyMenuTags(input: z.input<typeof applyInput>): Promise<{ ok: true; dishes: number } | { ok: false; error: string }> {
  const { restaurant } = await requireRestaurant();
  const parsed = applyInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Nothing to save" };
  const changes = parsed.data;
  const items = await db.menuItem.findMany({ where: { restaurantId: restaurant.id, id: { in: changes.map((c) => c.itemId) } }, select: { id: true, dietaryTags: true } });
  if (items.length !== new Set(changes.map((c) => c.itemId)).size) return { ok: false, error: "Something changed. Please reload the page." };
  const tagsOf = new Map(items.map((i) => [i.id, i.dietaryTags]));

  await db.$transaction(
    async (tx) => {
      const existing = await tx.allergen.findMany({ where: { restaurantId: restaurant.id }, select: { id: true, name: true, position: true } });
      const idOf = new Map(existing.map((a) => [a.name.toLowerCase(), a.id]));
      let pos = existing.reduce((m, a) => Math.max(m, a.position), -1) + 1;
      for (const c of changes) {
        if (c.tags.length) {
          const merged = DIETARY_TAGS.filter((t) => tagsOf.get(c.itemId)!.includes(t) || c.tags.includes(t));
          await tx.menuItem.update({ where: { id: c.itemId }, data: { dietaryTags: merged } });
        }
        for (const name of c.allergens) {
          let allergenId = idOf.get(name.toLowerCase());
          if (!allergenId) {
            allergenId = (await tx.allergen.create({ data: { restaurantId: restaurant.id, name, position: pos++ }, select: { id: true } })).id;
            idOf.set(name.toLowerCase(), allergenId);
          }
          await tx.menuItemAllergen.upsert({ where: { itemId_allergenId: { itemId: c.itemId, allergenId } }, create: { itemId: c.itemId, allergenId }, update: {} });
        }
      }
    },
    { timeout: 60_000 },
  );
  expireRestaurantCache(restaurant);
  return { ok: true, dishes: changes.length };
}
