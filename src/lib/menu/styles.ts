// Danh sách kiểu trang menu (template) mà chủ quán chọn được.
// Thêm kiểu mới:
//   1. thêm giá trị vào enum MenuStyle trong prisma/schema.prisma,
//   2. thêm một dòng vào MENU_STYLE_INFO bên dưới,
//   3. viết giao diện trong src/components/public-menu/styles/ và khai báo trong styles/index.ts.

export const MENU_STYLES = ["PHOTO", "CLASSIC"] as const;
export type MenuStyleKey = (typeof MENU_STYLES)[number];

export const MENU_STYLE_INFO: Record<MenuStyleKey, { name: string; text: string; bestFor: string }> = {
  PHOTO: {
    name: "Modern",
    text: "Clean cards with your colour, photos and dietary badges.",
    bestFor: "Cafés, brunch spots, places with great food photos",
  },
  CLASSIC: {
    name: "Classic",
    text: "A printed-menu look: serif type, dish name …… price on one line.",
    bestFor: "Long menus, family restaurants, diners, fine dining",
  },
};

export function isMenuStyle(v: unknown): v is MenuStyleKey {
  return typeof v === "string" && (MENU_STYLES as readonly string[]).includes(v);
}
