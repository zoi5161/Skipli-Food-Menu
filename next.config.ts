import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Link công khai của quán là /@ten-quan. Next không cho thư mục bắt đầu bằng "@"
  // (ký hiệu đó dành cho "parallel routes"), nên chuyển ngầm sang /m/ten-quan.
  // Header bảo mật cho mọi trang. Trang menu khách (/m/…) được phép nhúng vào website của quán (iframe);
  // các trang khác (đăng nhập, quản lý) thì không, để chống lừa bấm (clickjacking). Trang /preview chỉ nhúng được trong chính app.
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: common },
      { source: "/((?!m/|@|preview).*)", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
      // Trang xem trước của chủ quán: chỉ cho nhúng trong chính app (khung xem thử ở Settings → Design)
      { source: "/preview", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'self'" }] },
    ];
  },
  async rewrites() {
    return [{ source: "/@:slug", destination: "/m/:slug" }];
  },
  partialPrefetching: true,
  experimental: {
    // Ảnh món/logo gửi qua server action. Trình duyệt đã thu nhỏ ảnh trước, 4 MB là dư.
    serverActions: { bodySizeLimit: "4mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
