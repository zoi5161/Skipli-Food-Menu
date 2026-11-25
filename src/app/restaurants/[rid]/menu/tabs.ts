// Danh sách tab của trang Menu (dùng chung cho trang máy chủ và giao diện trình duyệt).
export const MENU_TABS = ["items", "categories", "extras", "allergens"] as const;
export type MenuTab = (typeof MENU_TABS)[number];
export const TAB_LABEL: Record<MenuTab, string> = { items: "Items", categories: "Categories", extras: "Extra", allergens: "Allergens" };
