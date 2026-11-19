import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";

// /sitemap.xml: các trang quán đang mở và chủ quán cho phép đưa vào sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3300").replace(/\/$/, "");
  const restaurants = await db.restaurant.findMany({
    where: { isPublished: true, inSitemap: true },
    select: { slug: true, updatedAt: true },
  });
  return restaurants.map((r) => ({ url: `${base}/@${r.slug}`, lastModified: r.updatedAt }));
}
