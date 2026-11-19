import { NextResponse } from "next/server";
import { MenuReadError, readMenuPhoto } from "@/lib/ai/menu-vision";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/menu/read-photo (multipart, trường "photo"): AI đọc ảnh menu giấy, trả danh mục và món
// để chủ quán XEM LẠI trước khi lưu (không lưu gì ở đây). Dựa trên ~/Downloads/skipli-ai-kit/example/route.ts.
// Chỉ chủ quán đã đăng nhập; tối đa READS_PER_DAY lần mỗi quán mỗi 24 giờ (key AI dùng chung hạn mức).

// (Không đặt `runtime`: cấu hình cacheComponents của repo không cho, và mặc định đã là Node.)
export const maxDuration = 60; // Gemini rồi Groq: menu dài có thể mất 20–40 giây

const MAX_BYTES = 8 * 1024 * 1024;
const READS_PER_DAY = 30;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in again to scan a menu" }, { status: 401 });
  const restaurant = await db.restaurant.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!restaurant) return NextResponse.json({ error: "Create your restaurant first" }, { status: 404 });

  const used = await db.aiMenuRead.count({ where: { restaurantId: restaurant.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (used >= READS_PER_DAY) {
    return NextResponse.json({ error: `You can scan up to ${READS_PER_DAY} photos a day. Please try again tomorrow, or add dishes by hand.` }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo of the menu" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The photo is over 8 MB" }, { status: 413 });

  try {
    const { categories, engine } = await readMenuPhoto({ bytes: await file.arrayBuffer(), mime: file.type }, { signal: req.signal });
    const dishes = categories.reduce((n, c) => n + c.items.length, 0);
    await db.aiMenuRead.create({ data: { restaurantId: restaurant.id, ok: dishes > 0, engine, dishes } });
    if (!dishes) return NextResponse.json({ error: "No dish could be read. Try a sharper, straight photo in good light." }, { status: 422 });
    return NextResponse.json({ categories, engine, remaining: READS_PER_DAY - used - 1 });
  } catch (e) {
    if (e instanceof MenuReadError) {
      if (e.reason === "no-key") return NextResponse.json({ error: "Menu scanning isn't set up yet. Add dishes by hand for now." }, { status: 501 });
      if (e.reason === "bad-image") return NextResponse.json({ error: "Use a JPG, PNG or WebP photo" }, { status: 400 });
      await db.aiMenuRead.create({ data: { restaurantId: restaurant.id, ok: false } });
      return NextResponse.json({ error: "The menu reader is busy. Please try again in a minute." }, { status: 503 });
    }
    throw e;
  }
}
