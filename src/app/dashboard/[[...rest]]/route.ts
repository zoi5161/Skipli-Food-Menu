import { NextResponse } from "next/server";
import { keepQuery, legacyTarget } from "@/lib/legacy-redirect";
import { restaurantPath, type RestaurantTab } from "@/lib/restaurant-path";

// Đường dẫn cũ /dashboard, /dashboard/menu, /dashboard/settings?tab=... (link trong email, dấu trang cũ).
// Nhân viên Skipli: về danh sách nhà hàng. Chủ một quán: vào đúng mục đó của quán mình.
const TABS = new Set<string>(["menu", "stats", "settings"]);

export async function GET(request: Request, { params }: RouteContext<"/dashboard/[[...rest]]">) {
  const { rest } = await params;
  const url = new URL(request.url);
  const tab = (rest?.[0] && TABS.has(rest[0]) ? rest[0] : "") as RestaurantTab;
  return NextResponse.redirect(new URL(await legacyTarget((id) => restaurantPath(id, tab, keepQuery(url))), url), 307);
}
