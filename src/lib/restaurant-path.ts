// Đường dẫn trong Studio. Dùng được ở cả server lẫn trình duyệt.

/** Tên header proxy.ts gắn vào mỗi yêu cầu: id quán đọc từ đường dẫn. */
export const RESTAURANT_HEADER = "x-skipli-restaurant";

export type RestaurantTab = "" | "menu" | "stats" | "settings";

/** /restaurants/<id>, /restaurants/<id>/menu ... (kèm ?query nếu có). */
export function restaurantPath(restaurantId: string, tab: RestaurantTab = "", query?: Record<string, string>) {
  const base = `/restaurants/${encodeURIComponent(restaurantId)}${tab ? `/${tab}` : ""}`;
  const qs = query ? new URLSearchParams(query).toString() : "";
  return qs ? `${base}?${qs}` : base;
}

export const previewPath = (restaurantId: string, query?: Record<string, string>) => {
  const qs = query ? new URLSearchParams(query).toString() : "";
  return `/preview/${encodeURIComponent(restaurantId)}${qs ? `?${qs}` : ""}`;
};

/** Đọc id quán từ đường dẫn: "/restaurants/abc/menu" → "abc". Trang danh sách và trang nhập CSV không có id. */
export function restaurantIdFromPath(pathname: string): string | null {
  const m = /^\/(?:restaurants|preview)\/([^/]+)/.exec(pathname);
  if (!m) return null;
  const id = decodeURIComponent(m[1]);
  return id === "import" || id === "new" || id === "bulk" ? null : id;
}
