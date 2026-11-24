// Biết database đang dùng là database trên máy (Docker) hay database thật trên mạng (Neon).
// Dùng làm chốt an toàn: lệnh nạp lại quán demo và bộ kiểm tra tự động chỉ chạy trên database trên máy,
// trừ khi cho phép rõ ràng, để không xóa hay làm bẩn dữ liệu thật.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

export function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Tên máy chủ database để in ra thông báo (không có mật khẩu). */
export function databaseHost(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname : "(not set)";
  } catch {
    return "(invalid URL)";
  }
}
