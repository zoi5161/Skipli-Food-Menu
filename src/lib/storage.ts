// Lưu file ảnh. Hai chế độ, chọn theo .env:
//
// 1. Kho chuẩn S3 (khi có đủ biến S3_*): Cloudflare R2 (đề xuất), Backblaze B2, Amazon S3, MinIO…
//    Đổi nhà cung cấp chỉ cần đổi biến trong .env, không sửa code.
//      S3_ENDPOINT          ví dụ https://<account-id>.r2.cloudflarestorage.com
//      S3_REGION            R2: "auto"; B2/S3: vùng của bucket (ví dụ us-east-005)
//      S3_BUCKET            tên bucket
//      S3_ACCESS_KEY_ID     khóa truy cập (chủ dự án tự điền)
//      S3_SECRET_ACCESS_KEY khóa bí mật (chủ dự án tự điền)
//      S3_PUBLIC_URL        địa chỉ công khai của bucket, ví dụ https://images.skiplimenu.com
//    Ảnh được trình duyệt tải thẳng từ kho (CDN), không đi qua máy chủ của app.
//
// 2. Thư mục storage/media trên máy (khi chưa có S3): chỉ để chạy thử trên máy.
//    Trên Vercel thư mục này không lưu lại được, nên ở đó bắt buộc dùng S3.
//
// File này dùng chung cho app (qua src/lib/media.ts) và cho lệnh seed dữ liệu demo.

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const LOCAL_PREFIX = "/media/";
export const LOCAL_ROOT = path.join(process.cwd(), "storage", "media");

export const IMAGE_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
export type ImageExt = keyof typeof IMAGE_TYPES;

const ID_RE = /^[a-z0-9]{10,40}$/;
const FILE_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Photo storage isn't set up (S3_* variables are missing)");
  }
}

type S3Config = { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicUrl: string; forcePathStyle: boolean };

function s3Config(): S3Config | null {
  const e = process.env;
  if (!e.S3_ENDPOINT || !e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY || !e.S3_PUBLIC_URL) return null;
  return {
    endpoint: e.S3_ENDPOINT,
    region: e.S3_REGION || "auto",
    bucket: e.S3_BUCKET,
    accessKeyId: e.S3_ACCESS_KEY_ID,
    secretAccessKey: e.S3_SECRET_ACCESS_KEY,
    publicUrl: e.S3_PUBLIC_URL.replace(/\/$/, ""),
    // Kiểu địa chỉ endpoint/bucket/key: R2, B2, MinIO đều nhận. Amazon S3 mới có thể cần "false".
    forcePathStyle: e.S3_FORCE_PATH_STYLE !== "false",
  };
}

export function storageMode(): "s3" | "local" {
  return s3Config() ? "s3" : "local";
}

let client: { key: string; s3: S3Client } | null = null;
function s3(cfg: S3Config): S3Client {
  const key = `${cfg.endpoint}|${cfg.accessKeyId}`;
  if (!client || client.key !== key) {
    client = {
      key,
      s3: new S3Client({ endpoint: cfg.endpoint, region: cfg.region, forcePathStyle: cfg.forcePathStyle, credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } }),
    };
  }
  return client.s3;
}

/** Lưu ảnh của một quán, trả về địa chỉ dùng trong thẻ <img>. Tên file ngẫu nhiên, không bao giờ ghi đè. */
export async function storeImage(restaurantId: string, bytes: Uint8Array, ext: ImageExt): Promise<string> {
  if (!ID_RE.test(restaurantId)) throw new Error("Bad id");
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  const cfg = s3Config();
  if (cfg) {
    await s3(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: `media/${restaurantId}/${name}`,
        Body: bytes,
        ContentType: IMAGE_TYPES[ext],
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${cfg.publicUrl}/media/${restaurantId}/${name}`;
  }
  if (process.env.VERCEL) throw new StorageNotConfiguredError();
  const dir = path.join(LOCAL_ROOT, restaurantId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `${LOCAL_PREFIX}${restaurantId}/${name}`;
}

/**
 * Tách địa chỉ ảnh thành [mã quán, tên file] nếu đó đúng là ảnh app đã lưu
 * (trên máy: /media/…; trên S3: <S3_PUBLIC_URL>/media/…). Địa chỉ lạ trả null.
 */
export function parseImageUrl(url: string | null | undefined): [string, string] | null {
  if (!url) return null;
  const cfg = s3Config();
  let rest: string | null = null;
  if (url.startsWith(LOCAL_PREFIX)) rest = url.slice(LOCAL_PREFIX.length);
  else if (cfg && url.startsWith(`${cfg.publicUrl}/media/`)) rest = url.slice(`${cfg.publicUrl}/media/`.length);
  if (rest === null) return null;
  const [id, file, ...more] = rest.split("/");
  return more.length === 0 && id && file && ID_RE.test(id) && FILE_RE.test(file) ? [id, file] : null;
}

/** Xóa ảnh cũ của quán (bỏ qua nếu không phải ảnh của quán này). Lỗi khi xóa không làm hỏng việc chính. */
export async function removeStoredImage(restaurantId: string, url: string | null | undefined) {
  const parts = parseImageUrl(url);
  if (!parts || parts[0] !== restaurantId) return;
  const cfg = s3Config();
  try {
    if (url!.startsWith(LOCAL_PREFIX)) await unlink(path.join(LOCAL_ROOT, ...parts));
    else if (cfg) await s3(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: `media/${parts[0]}/${parts[1]}` }));
  } catch {
    // ảnh đã bị xóa trước đó hoặc kho tạm lỗi: bỏ qua
  }
}
