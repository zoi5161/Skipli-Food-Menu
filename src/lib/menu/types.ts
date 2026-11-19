// Kiểu dữ liệu gọn gửi xuống trình duyệt (chỉ những trường giao diện cần).
import type { DietaryTagValue, Variant } from "./format";

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  isVisible: boolean;
  servingDays: number[];
  servingFrom: string | null;
  servingUntil: string | null;
};

export type MenuItemRow = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  variants: Variant[];
  imageUrl: string | null;
  isVisible: boolean;
  isSoldOut: boolean;
  isFeatured: boolean;
  dietaryTags: DietaryTagValue[];
  extraIds: string[];
  allergenIds: string[];
};

export type MenuExtra = { id: string; name: string; priceCents: number };
export type MenuAllergen = { id: string; name: string };

export type MenuData = {
  restaurant: { id: string; name: string; slug: string; currency: string };
  categories: MenuCategory[];
  items: MenuItemRow[];
  extras: MenuExtra[];
  allergens: MenuAllergen[];
};
