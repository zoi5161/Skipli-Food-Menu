import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { allergenCode, type DietaryTagValue, type Variant } from "./format";
import type { ContactChoice } from "./contact";
import type { MenuStyleKey } from "./styles";
import { parseHours, type WeekHours } from "./hours";

// Dữ liệu cho trang menu công khai (khách xem). Có lưu đệm để trang mở nhanh:
// - đọc database một lần rồi giữ kết quả,
// - mỗi lần chủ quán lưu thay đổi, gọi expireRestaurantCache() để xóa bản cũ ngay.

export function restaurantTag(restaurantId: string) {
  return `restaurant:${restaurantId}`;
}
export function slugTag(slug: string) {
  return `slug:${slug}`;
}

export type PublicItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  variants: Variant[];
  imageUrl: string | null;
  isSoldOut: boolean;
  isFeatured: boolean;
  dietaryTags: DietaryTagValue[];
  allergenCodes: string[];
  extras: { name: string; priceCents: number }[];
};

export type PublicCategory = {
  id: string;
  name: string;
  description: string | null;
  servingDays: number[];
  servingFrom: string | null;
  servingUntil: string | null;
  items: PublicItem[];
};

export type PublicMenu = {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    currency: string;
    logoUrl: string | null;
    coverUrl: string | null;
    galleryUrls: string[];
    accentColor: string;
    menuStyle: MenuStyleKey;
    addressLine: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    googleMapsUrl: string | null;
    addressNote: string | null;
    openingHours: WeekHours | null;
    customLinkLabel: string | null;
    customLinkUrl: string | null;
    phone: string | null;
    whatsapp: string | null;
    contactEmail: string | null;
    showDirections: boolean;
    primaryButton: ContactChoice;
    secondaryButton: ContactChoice;
    seoTitle: string | null;
    seoDescription: string | null;
    isPublished: boolean;
    plan: "FREE" | "PRO";
  };
  categories: PublicCategory[];
  allergens: { code: string; name: string }[];
};

/** Đọc menu theo slug (không lưu đệm). Dùng cho trang xem trước của chủ quán. */
export async function loadPublicMenu(slug: string): Promise<PublicMenu | null> {
  const r = await db.restaurant.findUnique({
    where: { slug },
    include: {
      allergens: { orderBy: [{ position: "asc" }, { name: "asc" }] },
      categories: {
        where: { isVisible: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          items: {
            where: { isVisible: true },
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
            include: {
              allergens: { select: { allergenId: true } },
              extras: { include: { extra: true } },
              variants: { orderBy: { position: "asc" }, select: { name: true, priceCents: true } },
            },
          },
        },
      },
    },
  });
  if (!r) return null;

  // Mã dị ứng (A, B, C…) tính theo thứ tự chủ quán xếp, giống trang quản lý.
  const codeOf = new Map(r.allergens.map((a, i) => [a.id, allergenCode(i)]));

  return {
    restaurant: {
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      currency: r.currency,
      logoUrl: r.logoUrl,
      coverUrl: r.coverUrl,
      galleryUrls: r.galleryUrls,
      accentColor: r.accentColor,
      menuStyle: r.menuStyle,
      addressLine: r.addressLine,
      city: r.city,
      region: r.region,
      postalCode: r.postalCode,
      googleMapsUrl: r.googleMapsUrl,
      addressNote: r.addressNote,
      openingHours: parseHours(r.openingHours),
      customLinkLabel: r.customLinkLabel,
      customLinkUrl: r.customLinkUrl,
      phone: r.phone,
      whatsapp: r.whatsapp,
      contactEmail: r.contactEmail,
      showDirections: r.showDirections,
      primaryButton: r.primaryButton,
      secondaryButton: r.secondaryButton,
      seoTitle: r.seoTitle,
      seoDescription: r.seoDescription,
      isPublished: r.isPublished,
      plan: r.plan,
    },
    categories: r.categories
      .filter((c) => c.items.length > 0)
      .map((c) => ({
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
          priceCents: i.priceCents,
          variants: i.variants,
          imageUrl: i.imageUrl,
          isSoldOut: i.isSoldOut,
          isFeatured: i.isFeatured,
          dietaryTags: i.dietaryTags,
          allergenCodes: i.allergens
            .map((a) => codeOf.get(a.allergenId))
            .filter((c): c is string => Boolean(c))
            .sort(),
          extras: i.extras
            .map((e) => e.extra)
            .sort((a, b) => a.position - b.position)
            .map((e) => ({ name: e.name, priceCents: e.priceCents })),
        })),
      })),
    allergens: r.allergens.map((a, i) => ({ code: allergenCode(i), name: a.name })),
  };
}

/** Bản có lưu đệm, dùng cho khách. */
export async function getPublicMenu(slug: string): Promise<PublicMenu | null> {
  "use cache";
  cacheLife("hours"); // phòng khi dữ liệu đổi ngoài app; bình thường bị xóa ngay khi chủ quán lưu
  cacheTag(slugTag(slug));
  const menu = await loadPublicMenu(slug);
  if (menu) cacheTag(restaurantTag(menu.restaurant.id));
  return menu;
}
