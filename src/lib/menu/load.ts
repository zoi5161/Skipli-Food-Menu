import "server-only";
import { db } from "@/lib/db";
import type { MenuData } from "./types";

/** Đọc toàn bộ menu của một quán, đã sắp theo thứ tự chủ quán xếp. */
export async function loadMenu(restaurant: { id: string; name: string; slug: string; currency: string }): Promise<MenuData> {
  const [categories, items, extras, allergens] = await Promise.all([
    db.category.findMany({ where: { restaurantId: restaurant.id }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: {
        extras: { select: { extraId: true } },
        allergens: { select: { allergenId: true } },
        variants: { orderBy: { position: "asc" }, select: { name: true, priceCents: true } },
      },
    }),
    db.extra.findMany({ where: { restaurantId: restaurant.id }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
    db.allergen.findMany({ where: { restaurantId: restaurant.id }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);

  return {
    restaurant: { id: restaurant.id, name: restaurant.name, slug: restaurant.slug, currency: restaurant.currency },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isVisible: c.isVisible,
      servingDays: c.servingDays,
      servingFrom: c.servingFrom,
      servingUntil: c.servingUntil,
    })),
    items: items.map((i) => ({
      id: i.id,
      categoryId: i.categoryId,
      name: i.name,
      description: i.description,
      priceCents: i.priceCents,
      variants: i.variants,
      imageUrl: i.imageUrl,
      isVisible: i.isVisible,
      isSoldOut: i.isSoldOut,
      isFeatured: i.isFeatured,
      dietaryTags: i.dietaryTags,
      extraIds: i.extras.map((e) => e.extraId),
      allergenIds: i.allergens.map((a) => a.allergenId),
    })),
    extras: extras.map((e) => ({ id: e.id, name: e.name, priceCents: e.priceCents })),
    allergens: allergens.map((a) => ({ id: a.id, name: a.name })),
  };
}
