import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { isbot } from "isbot";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LIMITS, classifySource, clientIp, deviceType, geoFromHeaders, hostOf, utcDay } from "./classify";

// Ghi lượt xem trang và lượt bấm món, theo quy tắc ở CLAUDE.md mục 5:
// không lưu IP thô, bỏ qua bot, 30 phút / 5 phút / 200 sự kiện mỗi ngày.

export type TrackInput =
  | { type: "view"; slug: string; src?: string | null; referrer?: string | null }
  | { type: "click"; slug: string; itemId: string };

export type TrackResult = { counted: boolean; reason?: "bot" | "owner" | "not-found" | "duplicate" | "daily-limit" };

const saltCache = new Map<string, string>();

/** Muối của ngày hôm nay (tạo mới nếu chưa có, xóa muối cũ hơn 2 ngày). */
async function saltFor(day: string): Promise<string> {
  const cached = saltCache.get(day);
  if (cached) return cached;
  const fresh = randomBytes(32).toString("hex");
  // Hai yêu cầu cùng lúc: chỉ một muối được lưu, cả hai cùng đọc lại muối đó.
  await db.dailySalt.upsert({ where: { day }, create: { day, salt: fresh }, update: {} });
  const row = await db.dailySalt.findUniqueOrThrow({ where: { day } });
  const twoDaysAgo = utcDay(new Date(Date.now() - 2 * 86_400_000));
  await db.dailySalt.deleteMany({ where: { day: { lt: twoDaysAgo } } });
  saltCache.clear();
  saltCache.set(day, row.salt);
  return row.salt;
}

export async function visitorHash(restaurantId: string, ip: string, userAgent: string, now = new Date()): Promise<string> {
  const salt = await saltFor(utcDay(now));
  return createHash("sha256").update(`${salt}|${restaurantId}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

/** Chỉ tin các header vị trí khi chạy trên Vercel (Vercel tự ghi đè, khách không giả được) hoặc khi chạy thử trên máy. */
function geo(headers: Headers) {
  const trusted = Boolean(process.env.VERCEL) || process.env.NODE_ENV !== "production";
  return trusted ? geoFromHeaders(headers) : { city: null, region: null, country: null, latitude: null, longitude: null };
}

export async function track(input: TrackInput, headers: Headers): Promise<TrackResult> {
  const userAgent = headers.get("user-agent") ?? "";
  if (!userAgent || isbot(userAgent)) return { counted: false, reason: "bot" };

  const restaurant = await db.restaurant.findUnique({ where: { slug: input.slug }, select: { id: true, ownerId: true, isPublished: true } });
  if (!restaurant || !restaurant.isPublished) return { counted: false, reason: "not-found" };

  // Chủ quán tự xem trang của mình thì không tính
  const user = await getCurrentUser();
  if (user?.id === restaurant.ownerId) return { counted: false, reason: "owner" };

  const now = new Date();
  const hash = await visitorHash(restaurant.id, clientIp(headers), userAgent, now);
  const startOfDay = new Date(`${utcDay(now)}T00:00:00.000Z`);
  const mine = { restaurantId: restaurant.id, visitorHash: hash };

  const [viewsToday, clicksToday] = await Promise.all([
    db.pageView.count({ where: { ...mine, createdAt: { gte: startOfDay } } }),
    db.itemClick.count({ where: { ...mine, createdAt: { gte: startOfDay } } }),
  ]);
  if (viewsToday + clicksToday >= LIMITS.eventsPerDay) return { counted: false, reason: "daily-limit" };

  if (input.type === "view") {
    const recent = await db.pageView.findFirst({ where: { ...mine, createdAt: { gte: new Date(now.getTime() - LIMITS.viewWindowMs) } }, select: { id: true } });
    if (recent) return { counted: false, reason: "duplicate" };
    const ownHost = hostOf(process.env.NEXT_PUBLIC_APP_URL) ?? hostOf(`https://${headers.get("host") ?? ""}`);
    const { source, referrerHost } = classifySource(input.src, input.referrer, ownHost);
    await db.pageView.create({
      data: { ...mine, source, referrerHost, device: deviceType(userAgent), ...geo(headers), createdAt: now },
    });
    return { counted: true };
  }

  const item = await db.menuItem.findFirst({ where: { id: input.itemId, restaurantId: restaurant.id }, select: { id: true } });
  if (!item) return { counted: false, reason: "not-found" };
  const recent = await db.itemClick.findFirst({
    where: { ...mine, itemId: item.id, createdAt: { gte: new Date(now.getTime() - LIMITS.clickWindowMs) } },
    select: { id: true },
  });
  if (recent) return { counted: false, reason: "duplicate" };
  await db.itemClick.create({ data: { ...mine, itemId: item.id, createdAt: now } });
  return { counted: true };
}
