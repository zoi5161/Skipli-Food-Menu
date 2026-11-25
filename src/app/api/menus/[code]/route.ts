import { getMenuFeed, isMenuCode } from "@/lib/menu/feed";

// GET /api/menus/<mã menu>: dữ liệu menu dạng JSON cho Skipli Now (và hệ thống khác).
// Chỉ đọc, không cần đăng nhập (mã dài 32 ký tự ngẫu nhiên, không đoán được). Món và danh mục đang ẩn không có trong kết quả.
// Định dạng: xem MenuFeed trong src/lib/menu/feed.ts.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

export async function GET(_req: Request, { params }: RouteContext<"/api/menus/[code]">) {
  const { code } = await params;
  const feed = isMenuCode(code) ? await getMenuFeed(code.toLowerCase()) : null;
  if (!feed) return Response.json({ error: "Menu not found" }, { status: 404, headers: CORS });
  return Response.json(feed, { headers: { ...CORS, "Cache-Control": "public, max-age=0, must-revalidate" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
