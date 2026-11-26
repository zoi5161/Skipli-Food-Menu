import "server-only";
import { MenuReadError, PDF_MIME, readMenuPhoto, type ReadMenuCategory } from "@/lib/ai/menu-vision";
import { db } from "@/lib/db";

// Cho AI đọc một file menu của một quán: kiểm tra hạn mức trong ngày, ghi lại lần đọc, đổi lỗi thành câu dễ hiểu.
// Dùng chung cho nút "Upload menu" (đọc ngay) và trang Bulk upload (đọc phía sau).

export const READS_PER_DAY = 30;

export type ReadOutcome =
  | { ok: true; categories: ReadMenuCategory[]; engine: string; dishes: number; remaining: number }
  | { ok: false; status: number; error: string; retry: boolean };

export async function readMenuForRestaurant(restaurantId: string, file: { bytes: Uint8Array | ArrayBuffer; mime: string }, signal?: AbortSignal): Promise<ReadOutcome> {
  const used = await db.aiMenuRead.count({ where: { restaurantId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (used >= READS_PER_DAY) {
    return { ok: false, status: 429, retry: false, error: `You can read up to ${READS_PER_DAY} files a day for one restaurant. Please try again tomorrow, or add dishes by hand.` };
  }
  const pdf = file.mime === PDF_MIME;
  try {
    const { categories, engine } = await readMenuPhoto(file, { signal });
    const dishes = categories.reduce((n, c) => n + c.items.length, 0);
    await db.aiMenuRead.create({ data: { restaurantId, ok: dishes > 0, engine, dishes } });
    if (!dishes) {
      const hint = pdf ? "Check that the PDF shows the menu text (not a blank or locked file)." : "Try a sharper, straight photo in good light.";
      return { ok: false, status: 422, retry: false, error: `No dish could be read. ${hint}` };
    }
    return { ok: true, categories, engine, dishes, remaining: READS_PER_DAY - used - 1 };
  } catch (e) {
    if (e instanceof MenuReadError) {
      if (e.reason === "no-key") return { ok: false, status: 501, retry: false, error: "Menu reading isn't set up yet. Add dishes by hand for now." };
      if (e.reason === "bad-image") return { ok: false, status: 400, retry: false, error: "Use a PDF, JPG, PNG or WebP file" };
      await db.aiMenuRead.create({ data: { restaurantId, ok: false } });
      return { ok: false, status: 503, retry: true, error: "The menu reader is busy. Please try again in a minute." };
    }
    throw e;
  }
}
