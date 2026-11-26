import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { StorageNotConfiguredError, s3Target } from "@/lib/storage";

// File menu gốc (PDF hoặc ảnh) nhân viên tải lên để AI đọc.
// Trình duyệt tải file THẲNG lên kho (link tải lên có hạn 10 phút), không đi qua máy chủ của app,
// nên không bị giới hạn ~4,5 MB mỗi yêu cầu của Vercel. Đọc xong / thêm vào menu xong thì xóa file.
// Chưa có kho S3 (chạy trên máy): lưu ở storage/menu-files, tải lên qua /restaurants/<id>/menu/upload.

export const MAX_MENU_FILE_BYTES = 20 * 1024 * 1024;
export const MENU_FILE_TYPES = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export type MenuFileMime = keyof typeof MENU_FILE_TYPES;
export const isMenuFileMime = (v: unknown): v is MenuFileMime => typeof v === "string" && v in MENU_FILE_TYPES;

const LOCAL_ROOT = path.join(process.cwd(), "storage", "menu-files");
const KEY_RE = /^menu-files\/([a-z0-9]{10,40})\/[a-f0-9]{24}\.(pdf|jpg|png|webp)$/;

/** File này có đúng là file menu của quán `restaurantId` không (chặn đọc file của quán khác). */
export function isMenuFileOf(restaurantId: string, key: unknown): key is string {
  const m = typeof key === "string" ? KEY_RE.exec(key) : null;
  return Boolean(m && m[1] === restaurantId);
}

export type UploadTicket = { key: string; url: string; headers: Record<string, string> };

/** Chỗ để tải một file lên: trả về vị trí file và link tải lên (PUT). */
export async function createMenuUpload(restaurantId: string, mime: MenuFileMime, size: number): Promise<UploadTicket> {
  if (size <= 0 || size > MAX_MENU_FILE_BYTES) throw new Error("USER:Files must be under 20 MB");
  const key = `menu-files/${restaurantId}/${randomBytes(12).toString("hex")}.${MENU_FILE_TYPES[mime]}`;
  const s3 = s3Target();
  if (s3) {
    const url = await getSignedUrl(s3.client, new PutObjectCommand({ Bucket: s3.bucket, Key: key, ContentType: mime }), { expiresIn: 600 });
    return { key, url, headers: { "Content-Type": mime } };
  }
  if (process.env.VERCEL) throw new StorageNotConfiguredError();
  return { key, url: `/restaurants/${restaurantId}/menu/upload?key=${encodeURIComponent(key)}`, headers: { "Content-Type": mime } };
}

/** Lưu file khi chạy trên máy (không có S3). */
export async function writeLocalMenuFile(key: string, bytes: Uint8Array) {
  const file = path.join(LOCAL_ROOT, ...key.split("/").slice(1));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

export class MenuFileMissingError extends Error {}

export async function readMenuFile(key: string): Promise<Uint8Array> {
  const s3 = s3Target();
  try {
    if (s3) {
      const out = await s3.client.send(new GetObjectCommand({ Bucket: s3.bucket, Key: key }));
      const bytes = await out.Body!.transformToByteArray();
      if (bytes.length > MAX_MENU_FILE_BYTES) throw new Error("USER:Files must be under 20 MB");
      return bytes;
    }
    return new Uint8Array(await readFile(path.join(LOCAL_ROOT, ...key.split("/").slice(1))));
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("USER:")) throw e;
    throw new MenuFileMissingError("The uploaded file was not found. Please upload it again.");
  }
}

export async function deleteMenuFile(key: string) {
  const s3 = s3Target();
  try {
    if (s3) await s3.client.send(new DeleteObjectCommand({ Bucket: s3.bucket, Key: key }));
    else await unlink(path.join(LOCAL_ROOT, ...key.split("/").slice(1)));
  } catch {
    // đã xóa trước đó: bỏ qua
  }
}
