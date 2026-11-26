"use server";

import { createMenuUpload, isMenuFileMime, type UploadTicket } from "@/lib/menu-files";
import { requireRestaurant } from "@/lib/restaurant";

/** Xin chỗ tải một file menu lên kho (link có hạn 10 phút). Quán lấy theo đường dẫn trang đang mở. */
export async function startMenuUpload(input: { mime: string; size: number }): Promise<{ ok: true; ticket: UploadTicket } | { ok: false; error: string }> {
  const { restaurant } = await requireRestaurant();
  if (!isMenuFileMime(input?.mime)) return { ok: false, error: "Use a PDF, JPG, PNG or WebP file" };
  try {
    return { ok: true, ticket: await createMenuUpload(restaurant.id, input.mime, Number(input.size)) };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("USER:")) return { ok: false, error: e.message.slice(5) };
    return { ok: false, error: "File storage isn't set up. Please try again later." };
  }
}
