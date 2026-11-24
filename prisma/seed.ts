// Dữ liệu demo: 5 quán GIẢ để thử app (dữ liệu ở prisma/demo-data.ts). Chạy: npx prisma db seed
// Mỗi quán có một tài khoản chủ quán riêng (đăng nhập bằng link hiện trên màn hình khi chạy trên máy):
//   demo@example.com (Lantern & Ladle), demo-taqueria@, demo-pho@, demo-pizza@, demo-cafe@example.com
// Chạy lại nhiều lần được: mỗi lần xóa các quán demo cũ rồi tạo lại.
// Chốt an toàn: chỉ chạy trên database trên máy. Đưa quán demo lên database thật (Neon) thì phải cho phép rõ ràng:
//   ALLOW_REMOTE_SEED=1 npx tsx --env-file=.env.deploy prisma/seed.ts

import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { databaseHost, isLocalDatabaseUrl } from "../src/lib/db-target";
import { removeStoredImage, storageMode, storeImage } from "../src/lib/storage";
import { DEMO_RESTAURANTS, type DemoRestaurant } from "./demo-data";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Ảnh demo (Unsplash, xem prisma/demo-images/CREDITS.md) được đưa vào kho ảnh giống như chủ quán tự tải lên:
// kho S3 nếu .env có cấu hình S3_*, nếu không thì thư mục storage/media trên máy.
const IMAGES_DIR = path.join(process.cwd(), "prisma", "demo-images");

const cents = (dollars: number) => Math.round(dollars * 100);

async function seedRestaurant(demo: DemoRestaurant) {
  const image = async (restaurantId: string, file: string) => {
    const bytes = new Uint8Array(await readFile(path.join(IMAGES_DIR, demo.imagesDir, file)));
    return storeImage(restaurantId, bytes, file.endsWith(".png") ? "png" : "jpg");
  };

  const user = await db.user.upsert({ where: { email: demo.email }, update: {}, create: { email: demo.email, name: "Demo Owner" } });
  await db.loginToken.deleteMany({ where: { email: demo.email } }); // để đăng nhập demo nhiều lần khi test

  // Xóa ảnh của bản demo cũ (trên máy hoặc trên kho S3)
  const old = await db.restaurant.findUnique({ where: { slug: demo.slug }, select: { id: true, logoUrl: true, coverUrl: true, galleryUrls: true, items: { select: { imageUrl: true } } } });
  if (old) {
    for (const url of [old.logoUrl, old.coverUrl, ...old.galleryUrls, ...old.items.map((i) => i.imageUrl)]) await removeStoredImage(old.id, url);
  }
  await db.restaurant.deleteMany({ where: { slug: demo.slug } });

  const restaurant = await db.restaurant.create({
    data: { ...demo.restaurant, ownerId: user.id, slug: demo.slug, showDirections: true, isPublished: true },
  });
  const gallery: string[] = [];
  for (const file of demo.gallery) gallery.push(await image(restaurant.id, file));
  await db.restaurant.update({
    where: { id: restaurant.id },
    data: { logoUrl: await image(restaurant.id, demo.logo), coverUrl: await image(restaurant.id, demo.cover), galleryUrls: gallery },
  });

  const allergenIds = new Map<string, string>();
  for (const [position, name] of demo.allergens.entries()) {
    const a = await db.allergen.create({ data: { restaurantId: restaurant.id, name, position } });
    allergenIds.set(name, a.id);
  }
  const extraIds = new Map<string, string>();
  for (const [position, [name, price]] of demo.extras.entries()) {
    const x = await db.extra.create({ data: { restaurantId: restaurant.id, name, priceCents: cents(price), position } });
    extraIds.set(name, x.id);
  }
  // Gõ sai tên dị ứng / món thêm trong demo-data.ts thì báo lỗi ngay, không âm thầm bỏ qua
  const lookup = (map: Map<string, string>, name: string, kind: string, item: string) => {
    const id = map.get(name);
    if (!id) throw new Error(`${demo.slug}: "${item}" uses unknown ${kind} "${name}"`);
    return id;
  };

  for (const [cPos, cat] of demo.menu.entries()) {
    const category = await db.category.create({
      data: {
        restaurantId: restaurant.id,
        name: cat.name,
        description: cat.description,
        position: cPos,
        servingDays: cat.days ?? [],
        servingFrom: cat.from ?? null,
        servingUntil: cat.until ?? null,
      },
    });
    for (const [iPos, item] of cat.items.entries()) {
      await db.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          priceCents: item.sizes ? Math.min(...item.sizes.map(([, p]) => cents(p))) : item.price === null ? null : cents(item.price),
          position: iPos,
          isSoldOut: item.soldOut ?? false,
          isFeatured: item.featured ?? false,
          imageUrl: item.image ? await image(restaurant.id, item.image) : null,
          dietaryTags: item.tags ?? [],
          allergens: { create: (item.allergens ?? []).map((n) => ({ allergenId: lookup(allergenIds, n, "allergen", item.name) })) },
          extras: { create: (item.extras ?? []).map((n) => ({ extraId: lookup(extraIds, n, "extra", item.name) })) },
          variants: { create: (item.sizes ?? []).map(([name, price], position) => ({ name, priceCents: cents(price), position })) },
        },
      });
    }
  }

  const stats = await seedAnalytics(restaurant.id, demo);
  const count = await db.menuItem.count({ where: { restaurantId: restaurant.id } });
  console.log(`Seeded "${restaurant.name}" (/@${restaurant.slug}): ${count} items, ${stats}. Login: ${demo.email}`);
}

/** Độ lệch giờ (giờ) của múi giờ so với UTC tại một thời điểm, ví dụ Chicago mùa đông = -6. */
function zoneOffsetHours(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return Math.round((asUtc - date.getTime()) / 3_600_000);
}

// ── Số liệu thống kê GIẢ (90 ngày), để trang Stats có dữ liệu khi xem thử ──
// Quy luật giống quán thật: theo thứ trong tuần và giờ ăn của từng quán; phần lớn khách quét QR;
// khách ở quanh thành phố của quán. Bộ sinh số ngẫu nhiên cố định nên mỗi lần seed ra như nhau.
async function seedAnalytics(restaurantId: string, demo: DemoRestaurant) {
  const { seed: start, places, dayBase, hourWeights } = demo.analytics;
  let seed = start;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(choices: Array<[T, number]>): T => {
    let r = rand() * choices.reduce((s, [, w]) => s + w, 0);
    for (const [v, w] of choices) if ((r -= w) < 0) return v;
    return choices[0][0];
  };
  const hex = () => Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");

  const items = await db.menuItem.findMany({ where: { restaurantId }, select: { id: true, isFeatured: true, imageUrl: true } });
  const itemWeights: Array<[string, number]> = items.map((i) => [i.id, (i.isFeatured ? 4 : 1) * (i.imageUrl ? 2 : 1)]);
  const sources: Array<[{ source: "QR" | "DIRECT" | "GOOGLE" | "INSTAGRAM" | "FACEBOOK" | "OTHER"; referrerHost: string | null }, number]> = [
    [{ source: "QR", referrerHost: null }, 45],
    [{ source: "DIRECT", referrerHost: null }, 20],
    [{ source: "GOOGLE", referrerHost: "google.com" }, 15],
    [{ source: "INSTAGRAM", referrerHost: "l.instagram.com" }, 11],
    [{ source: "FACEBOOK", referrerHost: "m.facebook.com" }, 4],
    [{ source: "OTHER", referrerHost: "yelp.com" }, 3],
    [{ source: "OTHER", referrerHost: "tripadvisor.com" }, 2],
  ];

  const now = Date.now();
  const views: object[] = [];
  const clicks: object[] = [];
  for (let back = 89; back >= 0; back--) {
    const date = new Date(now - back * 86_400_000);
    const offset = zoneOffsetHours(date, demo.restaurant.timeZone); // ví dụ -6 ở Chicago mùa đông
    const local = new Date(date.getTime() + offset * 3_600_000);
    const growth = 0.75 + 0.35 * ((89 - back) / 89); // quán đang đông dần
    const n = Math.round(dayBase[local.getUTCDay()] * growth * (0.85 + rand() * 0.3));
    const dayVisitors: string[] = [];
    for (let k = 0; k < n; k++) {
      const hour = pick(hourWeights);
      const at = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour - offset, Math.floor(rand() * 60), Math.floor(rand() * 60));
      if (at > now) continue;
      const visitorHash = dayVisitors.length > 3 && rand() < 0.12 ? dayVisitors[Math.floor(rand() * dayVisitors.length)] : hex();
      dayVisitors.push(visitorHash);
      const src = pick(sources);
      views.push({
        restaurantId,
        visitorHash,
        source: src.source,
        referrerHost: src.referrerHost,
        device: pick<"MOBILE" | "DESKTOP" | "TABLET">([["MOBILE", 82], ["DESKTOP", 12], ["TABLET", 6]]),
        ...pick(places),
        createdAt: new Date(at),
      });
      const taps = pick([[0, 30], [1, 35], [2, 22], [3, 13]]);
      for (let t = 0; t < taps; t++) {
        const tapAt = at + (t + 1) * (20 + Math.floor(rand() * 90)) * 1000;
        if (tapAt <= now) clicks.push({ restaurantId, visitorHash, itemId: pick(itemWeights), createdAt: new Date(tapAt) });
      }
    }
  }
  for (let i = 0; i < views.length; i += 2000) await db.pageView.createMany({ data: views.slice(i, i + 2000) as never });
  for (let i = 0; i < clicks.length; i += 2000) await db.itemClick.createMany({ data: clicks.slice(i, i + 2000) as never });
  return `${views.length} fake views and ${clicks.length} dish taps over 90 days`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!isLocalDatabaseUrl(url)) {
    if (process.env.ALLOW_REMOTE_SEED !== "1") {
      console.error(`Stopped: DATABASE_URL points to ${databaseHost(url)}, not a database on this computer.`);
      console.error("Seeding deletes and recreates the 5 demo restaurants there. If that is really what you want, run again with ALLOW_REMOTE_SEED=1.");
      process.exit(1);
    }
    console.log(`Seeding the database at ${databaseHost(url)} (ALLOW_REMOTE_SEED=1).`);
  }
  for (const demo of DEMO_RESTAURANTS) await seedRestaurant(demo);
  console.log(`Demo photos stored in: ${storageMode() === "s3" ? "S3 bucket" : "storage/media on this computer"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
