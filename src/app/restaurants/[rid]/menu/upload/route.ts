import { getCurrentUser } from "@/lib/auth";
import { MAX_MENU_FILE_BYTES, isMenuFileOf, writeLocalMenuFile } from "@/lib/menu-files";
import { findRestaurantFor } from "@/lib/restaurant";
import { storageMode } from "@/lib/storage";

// PUT /restaurants/<id>/menu/upload?key=...: nhận file menu khi chạy trên máy (chưa có kho S3).
// Có S3 thì trình duyệt tải thẳng lên kho bằng link có hạn, không dùng đường này.
export async function PUT(request: Request, { params }: RouteContext<"/restaurants/[rid]/menu/upload">) {
  if (storageMode() !== "local") return new Response("Not available", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const restaurant = await findRestaurantFor(user, (await params).rid);
  if (!restaurant) return new Response("Restaurant not found", { status: 404 });
  const key = new URL(request.url).searchParams.get("key");
  if (!isMenuFileOf(restaurant.id, key)) return new Response("Bad file", { status: 400 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_MENU_FILE_BYTES) return new Response("Files must be under 20 MB", { status: 413 });
  await writeLocalMenuFile(key, bytes);
  return new Response(null, { status: 204 });
}
