// Địa chỉ trang web.
//
// Bình thường cả hai hàm trả về NEXT_PUBLIC_APP_URL. Khi bản chạy trên máy dùng chung database
// với bản trên mạng (có REMOTE_APP_URL), link menu và mã QR hiện ở trang quản lý trên máy trỏ về
// bản trên mạng, vì đó là địa chỉ khách thật mở được.

const strip = (url: string) => url.replace(/\/$/, "");

/** Địa chỉ của chính bản đang chạy (link đăng nhập, robots, sitemap). */
export function appUrl(): string {
  return strip(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3300");
}

/** Địa chỉ khách dùng để mở menu (link menu, mã QR). */
export function publicSiteUrl(): string {
  return strip(process.env.REMOTE_APP_URL || appUrl());
}
