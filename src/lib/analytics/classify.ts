// Phân loại một lượt xem: đến từ đâu, máy gì, ở thành phố nào.
// Các hàm ở đây không đụng database, dễ kiểm tra riêng.

export type Source = "QR" | "DIRECT" | "INSTAGRAM" | "FACEBOOK" | "GOOGLE" | "OTHER";
export type Device = "MOBILE" | "TABLET" | "DESKTOP";

/** Giới hạn chống spam (theo CLAUDE.md mục 5). */
export const LIMITS = {
  viewWindowMs: 30 * 60_000, // 1 khách chỉ tính 1 lượt xem trong 30 phút
  clickWindowMs: 5 * 60_000, // 1 món chỉ tính 1 lượt bấm của 1 khách trong 5 phút
  eventsPerDay: 200, // tối đa 200 sự kiện / khách / ngày
};

/** Dấu ?src=… chủ quán có thể gắn vào link (QR tự gắn src=qr). */
const SRC_TAGS: Record<string, Source> = {
  qr: "QR",
  ig: "INSTAGRAM",
  instagram: "INSTAGRAM",
  fb: "FACEBOOK",
  facebook: "FACEBOOK",
  google: "GOOGLE",
  gbp: "GOOGLE",
};

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/**
 * Nguồn truy cập. Ưu tiên dấu ?src=, sau đó đến trang trước đó (referrer).
 * Không có gì (gõ link, mở từ tin nhắn, app không gửi nguồn) = DIRECT.
 */
export function classifySource(src: string | null | undefined, referrer: string | null | undefined, ownHost: string | null): { source: Source; referrerHost: string | null } {
  const tag = src ? SRC_TAGS[src.trim().toLowerCase()] : undefined;
  const host = hostOf(referrer);
  if (tag) return { source: tag, referrerHost: host };
  if (!host || (ownHost && host === ownHost.replace(/^www\./, ""))) return { source: "DIRECT", referrerHost: null };
  if (/(^|\.)instagram\.com$/.test(host) || host === "l.instagram.com") return { source: "INSTAGRAM", referrerHost: host };
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(host)) return { source: "FACEBOOK", referrerHost: host };
  if (/(^|\.)google\.[a-z.]+$/.test(host) || host === "maps.app.goo.gl" || host === "g.co") return { source: "GOOGLE", referrerHost: host };
  return { source: "OTHER", referrerHost: host };
}

export function deviceType(userAgent: string): Device {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(userAgent)) return "TABLET";
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(userAgent)) return "MOBILE";
  return "DESKTOP";
}

/** IP của khách (chỉ dùng để băm, không lưu). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

function decodeHeader(v: string | null): string | null {
  if (!v) return null;
  try {
    const s = decodeURIComponent(v).trim();
    return s ? s.slice(0, 80) : null;
  } catch {
    return v.slice(0, 80);
  }
}

export type Geo = { city: string | null; region: string | null; country: string | null; latitude: number | null; longitude: number | null };

/** Làm tròn tọa độ còn 1 chữ số thập phân (~10 km): đủ để chấm thành phố trên bản đồ, không định vị được người. */
export function roundCoord(v: string | null, limit: number): number | null {
  if (v === null || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  return Math.round(n * 10) / 10;
}

/**
 * Thành phố / bang / quốc gia và tọa độ gần đúng của thành phố, do máy chủ hosting (Vercel) gắn vào
 * theo nhà mạng của khách (không phải GPS, không hỏi quyền vị trí). Không gọi dịch vụ ngoài.
 * Tọa độ được làm tròn ~10 km. Chạy trên máy thì không có (để trống).
 */
export function geoFromHeaders(headers: Headers): Geo {
  const latitude = roundCoord(headers.get("x-vercel-ip-latitude"), 90);
  const longitude = roundCoord(headers.get("x-vercel-ip-longitude"), 180);
  const both = latitude !== null && longitude !== null;
  return {
    city: decodeHeader(headers.get("x-vercel-ip-city")),
    region: decodeHeader(headers.get("x-vercel-ip-country-region")),
    country: decodeHeader(headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"))?.toUpperCase() ?? null,
    latitude: both ? latitude : null,
    longitude: both ? longitude : null,
  };
}

/** Ngày theo giờ UTC, dạng "2026-11-19" (dùng để đổi muối mỗi ngày). */
export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
