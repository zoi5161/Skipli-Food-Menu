import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { IMAGE_TYPES, LOCAL_PREFIX, LOCAL_ROOT, parseImageUrl, removeStoredImage, storeImage, type ImageExt } from "./storage";

// Ảnh của quán (logo, ảnh bìa, ảnh món, ảnh giới thiệu). Chỗ lưu thật nằm ở src/lib/storage.ts:
// kho chuẩn S3 (Cloudflare R2, Backblaze B2, Amazon S3…) khi có cấu hình, hoặc thư mục trên máy khi chạy thử.

export const MEDIA_PREFIX = LOCAL_PREFIX;
/** Ảnh đã được trình duyệt thu nhỏ trước khi gửi, nên 3 MB là dư. */
export const MAX_IMAGE_BYTES = 3_000_000;

/** Nhận diện ảnh bằng mấy byte đầu file (không tin vào tên file hay loại file trình duyệt gửi). */
export function detectImageType(b: Uint8Array): ImageExt | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length > 12 && String.fromCharCode(...b.subarray(0, 4)) === "RIFF" && String.fromCharCode(...b.subarray(8, 12)) === "WEBP") return "webp";
  return null;
}

/** Lưu ảnh, trả về đường dẫn dùng được trong thẻ <img>. */
export async function saveImage(restaurantId: string, bytes: Uint8Array): Promise<string> {
  const ext = detectImageType(bytes);
  if (!ext) throw new Error("Not an image");
  return storeImage(restaurantId, bytes, ext);
}

/** Xóa ảnh cũ của quán (bỏ qua nếu đường dẫn không phải ảnh của quán này). */
export async function deleteImage(restaurantId: string, url: string | null | undefined) {
  await removeStoredImage(restaurantId, url);
}

/** Đọc ảnh lưu trên máy để trả cho trình duyệt. Chỉ nhận đúng dạng tên file app tạo ra (chặn đọc file khác). */
export async function readMedia(segments: string[]): Promise<{ bytes: Buffer; type: string } | null> {
  const parts = parseImageUrl(MEDIA_PREFIX + segments.join("/"));
  if (!parts) return null;
  const ext = parts[1].split(".")[1] as ImageExt;
  try {
    return { bytes: await readFile(path.join(LOCAL_ROOT, ...parts)), type: IMAGE_TYPES[ext] };
  } catch {
    return null;
  }
}
