import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/site-url";
import { loadPublicMenu, restaurantTag } from "./public";

// Dữ liệu menu theo MÃ MENU (dạng 571d...-....) cho hệ thống khác như Skipli Now:
// GET /api/menus/<mã> trả JSON gồm quán, danh mục, món, giá. Mã giữ nguyên khi sửa menu,
// nên chỉ cần dán mã một lần. Khi có định dạng Skipli Now cần, thêm một hàm đổi từ MenuFeed sang định dạng đó.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isMenuCode = (v: string) => UUID.test(v);

const dollars = (cents: number | null) => (cents === null ? null : Math.round(cents) / 100);

export type MenuFeed = {
  menuId: string;
  restaurant: {
    name: string;
    tagline: string | null;
    address: { line: string | null; city: string | null; state: string | null; zip: string | null };
    phone: string | null;
    email: string | null;
    website: string | null;
    currency: string;
    logoUrl: string | null;
    coverUrl: string | null;
    menuUrl: string; // trang menu đầy đủ cho khách
    published: boolean;
  };
  categories: {
    id: string;
    name: string;
    description: string | null;
    /** 0 = Chủ nhật … 6 = Thứ bảy; rỗng = mọi ngày */
    servingDays: number[];
    servingFrom: string | null;
    servingUntil: string | null;
    items: {
      id: string;
      name: string;
      description: string | null;
      /** Giá theo đơn vị tiền (12.5 = $12.50); null khi không ghi giá hoặc có nhiều cỡ */
      price: number | null;
      sizes: { name: string; price: number }[];
      soldOut: boolean;
      featured: boolean;
      dietaryTags: string[];
      allergens: string[];
      extras: { name: string; price: number }[];
      imageUrl: string | null;
    }[];
  }[];
  itemCount: number;
  generatedAt: string;
};

/** Menu theo mã (có lưu đệm; xóa ngay mỗi lần lưu thay đổi của quán). Không có mã đó: null. */
export async function getMenuFeed(code: string): Promise<MenuFeed | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`menu-code:${code.toLowerCase()}`);
  if (!isMenuCode(code)) return null;
  const found = await db.restaurant.findUnique({ where: { menuCode: code.toLowerCase() }, select: { slug: true, menuCode: true } });
  if (!found) return null;
  const menu = await loadPublicMenu(found.slug);
  if (!menu) return null;
  cacheTag(restaurantTag(menu.restaurant.id));

  const r = menu.restaurant;
  const allergenName = new Map(menu.allergens.map((a) => [a.code, a.name]));
  const categories = menu.categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    servingDays: c.servingDays,
    servingFrom: c.servingFrom,
    servingUntil: c.servingUntil,
    items: c.items.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.variants.length >= 2 ? null : dollars(i.priceCents),
      sizes: i.variants.length >= 2 ? i.variants.map((v) => ({ name: v.name, price: dollars(v.priceCents)! })) : [],
      soldOut: i.isSoldOut,
      featured: i.isFeatured,
      dietaryTags: i.dietaryTags,
      allergens: i.allergenCodes.map((code) => allergenName.get(code) ?? code),
      extras: i.extras.map((e) => ({ name: e.name, price: dollars(e.priceCents)! })),
      imageUrl: i.imageUrl,
    })),
  }));
  return {
    menuId: found.menuCode,
    restaurant: {
      name: r.name,
      tagline: r.tagline,
      address: { line: r.addressLine, city: r.city, state: r.region, zip: r.postalCode },
      phone: r.phone,
      email: r.contactEmail,
      website: r.customLinkUrl,
      currency: r.currency,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      menuUrl: `${appUrl()}/@${r.slug}`,
      published: r.isPublished,
    },
    categories,
    itemCount: categories.reduce((n, c) => n + c.items.length, 0),
    generatedAt: new Date().toISOString(),
  };
}
