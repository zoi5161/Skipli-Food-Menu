import type { MetadataRoute } from "next";

// /robots.txt: cho Google đọc trang menu công khai, không đọc trang quản lý.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3300").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/preview", "/auth", "/login", "/onboarding"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
