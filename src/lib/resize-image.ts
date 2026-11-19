// Thu nhỏ ảnh ngay trên trình duyệt trước khi tải lên (chạy trên máy chủ quán).
// Ảnh chụp bằng điện thoại thường 3–8 MB; sau khi thu nhỏ còn khoảng 200–500 KB,
// tải lên nhanh hơn và trang menu của khách mở nhanh hơn. Không cần thư viện ngoài.

import { MAX_IMAGE_EDGE } from "./media-limits";

export async function resizeImage(file: File, { maxEdge = MAX_IMAGE_EDGE, keepPng = false } = {}): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPG, PNG or WebP)");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo can't be opened. Try a JPG or PNG.");
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // Logo PNG có nền trong suốt thì giữ PNG; còn lại đổi sang JPEG cho nhẹ (nền trắng).
  const type = keepPng && file.type === "image/png" ? "image/png" : "image/jpeg";
  if (type === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  if (!blob) throw new Error("This photo can't be processed. Try another one.");
  return blob;
}
