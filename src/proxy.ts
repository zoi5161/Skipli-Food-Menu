import { NextResponse, type NextRequest } from "next/server";
import { RESTAURANT_HEADER, restaurantIdFromPath } from "@/lib/restaurant-path";

// Gắn id quán (đọc từ đường dẫn /restaurants/<id>/...) vào mỗi yêu cầu, gồm cả lúc bấm lưu
// (server action gửi tới đúng đường dẫn trang đang mở). Header do trình duyệt tự gửi lên bị xóa trước,
// và quyền vào quán vẫn được kiểm tra lại ở requireRestaurant().
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete(RESTAURANT_HEADER);
  const id = restaurantIdFromPath(request.nextUrl.pathname);
  if (id) headers.set(RESTAURANT_HEADER, id);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/restaurants/:path*", "/preview/:path*"] };
