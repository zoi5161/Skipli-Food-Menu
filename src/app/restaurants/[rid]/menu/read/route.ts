import { NextResponse } from "next/server";
import { MenuReadError, PDF_MIME, readMenuPhoto } from "@/lib/ai/menu-vision";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { findRestaurantFor } from "@/lib/restaurant";

// POST /restaurants/<id>/menu/read (multipart, trường "photo"): AI đọc ảnh hoặc file PDF menu giấy, trả danh mục và món
// để XEM LẠI trước khi lưu (không lưu gì ở đây). Dựa trên ~/Downloads/skipli-ai-kit/example/route.ts.
// Người đăng nhập phải được làm quán đó; tối đa READS_PER_DAY lần mỗi quán mỗi 24 giờ (key AI dùng chung hạn mức).

// (Không đặt `runtime`: cấu hình cacheComponents của repo không cho, và mặc định đã là Node.)
export const maxDuration = 120; // ảnh: Gemini rồi Groq, 20–40 giây; PDF nhiều trang: có thể tới 100 giây

const MAX_BYTES = 8 * 1024 * 1024;
// Vercel không nhận yêu cầu lớn hơn ~4,5 MB, nên PDF giới hạn 4 MB (ảnh đã được thu nhỏ trên trình duyệt trước khi gửi).
export const MAX_PDF_BYTES = 4 * 1024 * 1024;
const READS_PER_DAY = 30;

export async function POST(req: Request, { params }: RouteContext<"/restaurants/[rid]/menu/read">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in again to scan a menu" }, { status: 401 });
  const restaurant = await findRestaurantFor(user, (await params).rid);
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const used = await db.aiMenuRead.count({ where: { restaurantId: restaurant.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (used >= READS_PER_DAY) {
    return NextResponse.json({ error: `You can scan up to ${READS_PER_DAY} files a day for one restaurant. Please try again tomorrow, or add dishes by hand.` }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF or a photo of the menu" }, { status: 400 });
  const pdf = file.type === PDF_MIME;
  if (pdf && file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "The PDF is over 4 MB. Save it smaller, or upload photos of the pages." }, { status: 413 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The photo is over 8 MB" }, { status: 413 });

  try {
    const { categories, engine } = await readMenuPhoto({ bytes: await file.arrayBuffer(), mime: file.type }, { signal: req.signal });
    const dishes = categories.reduce((n, c) => n + c.items.length, 0);
    await db.aiMenuRead.create({ data: { restaurantId: restaurant.id, ok: dishes > 0, engine, dishes } });
    if (!dishes) {
      const hint = pdf ? "Check that the PDF shows the menu text (not a blank or locked file)." : "Try a sharper, straight photo in good light.";
      return NextResponse.json({ error: `No dish could be read. ${hint}` }, { status: 422 });
    }
    return NextResponse.json({ categories, engine, remaining: READS_PER_DAY - used - 1 });
  } catch (e) {
    if (e instanceof MenuReadError) {
      if (e.reason === "no-key") return NextResponse.json({ error: "Menu scanning isn't set up yet. Add dishes by hand for now." }, { status: 501 });
      if (e.reason === "bad-image") return NextResponse.json({ error: "Use a PDF, JPG, PNG or WebP file" }, { status: 400 });
      await db.aiMenuRead.create({ data: { restaurantId: restaurant.id, ok: false } });
      return NextResponse.json({ error: "The menu reader is busy. Please try again in a minute." }, { status: 503 });
    }
    throw e;
  }
}
