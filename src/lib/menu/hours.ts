// Giờ mở cửa của quán. Dùng được cả ở máy chủ lẫn trình duyệt.
// Lưu trong database: mảng 7 ngày (0 = Chủ nhật … 6 = Thứ bảy).
// Nếu giờ đóng cửa nhỏ hơn giờ mở (ví dụ 18:00–02:00) thì hiểu là đóng sau nửa đêm.

import { formatClock } from "./format";

export type DayHours = { closed: boolean; from: string; until: string };
export type WeekHours = DayHours[];

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Thứ tự hiện trên trang: Thứ hai trước, Chủ nhật cuối (kiểu Mỹ thường dùng). */
export const WEEK_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0];

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function defaultHours(): WeekHours {
  return Array.from({ length: 7 }, () => ({ closed: false, from: "11:00", until: "21:00" }));
}

/** Đọc giờ từ database; dữ liệu sai thì coi như chưa nhập. */
export function parseHours(value: unknown): WeekHours | null {
  if (!Array.isArray(value) || value.length !== 7) return null;
  const out: WeekHours = [];
  for (const d of value) {
    if (!d || typeof d !== "object") return null;
    const { closed, from, until } = d as Record<string, unknown>;
    if (typeof closed !== "boolean" || typeof from !== "string" || typeof until !== "string") return null;
    if (!closed && (!CLOCK.test(from) || !CLOCK.test(until) || from === until)) return null;
    out.push({ closed, from, until });
  }
  return out;
}

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export function formatDayHours(d: DayHours): string {
  return d.closed ? "Closed" : `${formatClock(d.from)} – ${formatClock(d.until)}`;
}

export type OpenStatus = {
  open: boolean;
  /** Ví dụ "Open now", "Closed". */
  headline: string;
  /** Ví dụ "until 10:00 PM", "opens at 12:00 PM today", "opens Thursday 11:00 AM". */
  detail: string | null;
};

/**
 * Quán đang mở hay đóng, và khi nào đổi trạng thái.
 * `day` 0–6, `minutes` = số phút từ nửa đêm (giờ địa phương của khách).
 */
export function openStatus(hours: WeekHours, day: number, minutes: number): OpenStatus {
  const today = hours[day];
  const yesterday = hours[(day + 6) % 7];

  // Ca hôm qua kéo qua nửa đêm (ví dụ 18:00–02:00) và vẫn chưa đóng
  if (!yesterday.closed && toMin(yesterday.until) < toMin(yesterday.from) && minutes < toMin(yesterday.until)) {
    return { open: true, headline: "Open now", detail: `until ${formatClock(yesterday.until)}` };
  }
  if (!today.closed) {
    const from = toMin(today.from);
    const until = toMin(today.until);
    const overnight = until < from;
    if (minutes >= from && (overnight || minutes < until)) {
      return { open: true, headline: "Open now", detail: `until ${formatClock(today.until)}` };
    }
    if (minutes < from) return { open: false, headline: "Closed", detail: `opens at ${formatClock(today.from)} today` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (!hours[d].closed) {
      const when = i === 1 ? "tomorrow" : DAY_NAMES[d];
      return { open: false, headline: "Closed", detail: `opens ${when} at ${formatClock(hours[d].from)}` };
    }
  }
  return { open: false, headline: "Closed", detail: null };
}
