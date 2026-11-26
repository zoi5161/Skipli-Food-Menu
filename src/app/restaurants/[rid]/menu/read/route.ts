import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MenuFileMissingError, deleteMenuFile, isMenuFileMime, isMenuFileOf, readMenuFile } from "@/lib/menu-files";
import { readMenuForRestaurant } from "@/lib/menu/read-file";
import { findRestaurantFor } from "@/lib/restaurant";

// POST /restaurants/<id>/menu/read: AI đọc menu giấy, trả danh mục và món để XEM LẠI trước khi lưu (không lưu gì ở đây).
//  - Ảnh (đã thu nhỏ trên trình duyệt): multipart, trường "photo".
//  - PDF / file lớn: trình duyệt tải thẳng lên kho trước (xem src/lib/menu-files.ts), rồi gửi JSON { key, mime }.
// Người đăng nhập phải được làm quán đó; tối đa 30 lần đọc mỗi quán mỗi 24 giờ (key AI dùng chung hạn mức).

// (Không đặt `runtime`: cấu hình cacheComponents của repo không cho, và mặc định đã là Node.)
export const maxDuration = 180; // ảnh: 20–40 giây; PDF lớn: tải lên Gemini rồi đọc, có thể vài phút

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request, { params }: RouteContext<"/restaurants/[rid]/menu/read">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in again to scan a menu" }, { status: 401 });
  const restaurant = await findRestaurantFor(user, (await params).rid);
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  let file: { bytes: Uint8Array | ArrayBuffer; mime: string };
  let uploadedKey: string | null = null;
  if (req.headers.get("content-type")?.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as { key?: unknown; mime?: unknown } | null;
    if (!isMenuFileOf(restaurant.id, body?.key) || !isMenuFileMime(body?.mime)) return NextResponse.json({ error: "Upload the file again" }, { status: 400 });
    uploadedKey = body.key as string;
    try {
      file = { bytes: await readMenuFile(uploadedKey), mime: body.mime as string };
    } catch (e) {
      if (e instanceof MenuFileMissingError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof Error && e.message.startsWith("USER:")) return NextResponse.json({ error: e.message.slice(5) }, { status: 413 });
      throw e;
    }
  } else {
    const form = await req.formData().catch(() => null);
    const photo = form?.get("photo");
    if (!(photo instanceof File)) return NextResponse.json({ error: "Choose a PDF or a photo of the menu" }, { status: 400 });
    if (photo.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "The photo is over 8 MB" }, { status: 413 });
    file = { bytes: await photo.arrayBuffer(), mime: photo.type };
  }

  try {
    const r = await readMenuForRestaurant(restaurant.id, file, req.signal);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ categories: r.categories, engine: r.engine, remaining: r.remaining });
  } finally {
    // File gốc chỉ cần cho lần đọc này (đọc lại thì tải lên lại)
    if (uploadedKey) await deleteMenuFile(uploadedKey);
  }
}
