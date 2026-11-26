// Tải một file lên bằng link PUT (kho S3 hoặc /restaurants/<id>/menu/upload khi chạy trên máy), có báo tiến độ.
// Dùng ở trình duyệt.

export const MAX_MENU_FILE_MB = 20;
export const isPdfFile = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
export const menuFileMime = (f: File) => (isPdfFile(f) ? "application/pdf" : f.type);

export function putFile(url: string, headers: Record<string, string>, file: Blob, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}). Please try again.`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}
