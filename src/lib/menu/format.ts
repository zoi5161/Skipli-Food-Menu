// Các hàm định dạng dùng chung cho trang chủ quán và trang khách.
// Không phụ thuộc database nên dùng được cả ở client lẫn server, và dễ viết test.

// ── Giá ──────────────────────────────────────────────

/** 1250 → "$12.50" */
export function formatPrice(cents: number | null | undefined, currency = "USD"): string {
  if (cents === null || cents === undefined) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** 1250 → "12.50" (dùng để điền sẵn ô nhập giá) */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

/**
 * Đọc giá chủ quán gõ vào. Chấp nhận "12", "12.5", "12,50", "$12.50".
 * Trả về { ok, cents } — cents = null nghĩa là để trống (không ghi giá).
 */
export function parsePriceInput(
  raw: string,
): { ok: true; cents: number | null } | { ok: false; error: string } {
  const text = raw.trim().replace(/^\$/, "").replace(/\s/g, "");
  if (text === "") return { ok: true, cents: null };
  // Cho phép dấu phẩy thập phân (12,50) nhưng không cho dấu phẩy hàng nghìn lẫn lộn.
  const normalized = /^\d+,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return { ok: false, error: "Enter a price like 12 or 12.50" };
  }
  const cents = Math.round(Number(normalized) * 100);
  if (cents > 100_000_00) return { ok: false, error: "Price is too high" };
  return { ok: true, cents };
}

// ── Link quán ──────────────────────────────────────────

/** "Lantern & Ladle Café" → "lantern-and-ladle-cafe" */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "menu";
}

// ── Mã dị ứng ─────────────────────────────────────────

/** 0 → "A", 25 → "Z", 26 → "AA" */
export function allergenCode(index: number): string {
  let n = index;
  let code = "";
  do {
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return code;
}

// ── Giờ phục vụ ────────────────────────────────────────

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Thứ tự hiển thị: bắt đầu từ thứ Hai */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function dayShort(day: number): string {
  return DAY_SHORT[day] ?? "";
}

/** "07:00" → "7:00 AM", "13:30" → "1:30 PM" */
export function formatClock(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const h = Number(match[1]);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${match[2]} ${suffix}`;
}

/** [1,2,3,4,5] → "Mon–Fri"; [1,3,5] → "Mon, Wed, Fri"; tất cả 7 ngày → "Every day" */
export function formatDays(days: number[]): string {
  const set = new Set(days);
  const ordered = WEEK_ORDER.filter((d) => set.has(d));
  if (ordered.length === 0 || ordered.length === 7) return "Every day";

  // Gom các ngày liên tiếp (theo thứ tự Mon→Sun) thành khoảng.
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i <= ordered.length; i++) {
    const prevIdx = WEEK_ORDER.indexOf(ordered[i - 1]);
    const currIdx = i < ordered.length ? WEEK_ORDER.indexOf(ordered[i]) : -1;
    if (currIdx !== prevIdx + 1) {
      const run = ordered.slice(start, i);
      parts.push(
        run.length >= 3
          ? `${dayShort(run[0])}–${dayShort(run[run.length - 1])}`
          : run.map(dayShort).join(", "),
      );
      start = i;
    }
  }
  return parts.join(", ");
}

/**
 * Chuỗi giờ phục vụ hiện cạnh tên danh mục, ví dụ "Mon–Fri · 7:00 AM–11:00 AM".
 * Trả về "" nếu danh mục phục vụ cả ngày, mọi ngày.
 */
export function formatServingTimes(
  days: number[],
  from: string | null | undefined,
  until: string | null | undefined,
): string {
  const hasDays = days.length > 0 && days.length < 7;
  const hasHours = Boolean(from && until);
  if (!hasDays && !hasHours) return "";
  const dayText = formatDays(days);
  const hourText = hasHours ? `${formatClock(from!)}–${formatClock(until!)}` : "All day";
  return `${dayText} · ${hourText}`;
}

// ── Nhãn chế độ ăn ─────────────────────────────────────

export const DIETARY_TAGS = [
  "VEGETARIAN",
  "VEGAN",
  "GLUTEN_FREE",
  "DAIRY_FREE",
  "NUT_FREE",
  "HALAL",
  "SPICY",
] as const;
export type DietaryTagValue = (typeof DIETARY_TAGS)[number];

export const DIETARY_LABEL: Record<DietaryTagValue, string> = {
  VEGETARIAN: "Vegetarian",
  VEGAN: "Vegan",
  GLUTEN_FREE: "Gluten-free",
  DAIRY_FREE: "Dairy-free",
  NUT_FREE: "Nut-free",
  HALAL: "Halal",
  SPICY: "Spicy",
};

// ── Giá theo cỡ ─────────────────────────────────────

export type Variant = { name: string; priceCents: number };
export const MAX_VARIANTS = 6;

/**
 * Cách hiện giá của một món:
 * - một giá: "$12.00"
 * - 2 cỡ tên ngắn: từng cỡ ("Glass $10.00 · Bottle $36.00")
 * - nhiều cỡ hơn: "from $4.00"
 * - không có giá: null
 */
export type PriceDisplay =
  | { kind: "single"; text: string }
  | { kind: "sizes"; parts: { name: string; price: string }[] }
  | { kind: "from"; text: string }
  | null;

export function priceDisplay(priceCents: number | null, variants: Variant[], currency: string): PriceDisplay {
  if (variants.length > 0) {
    if (variants.length <= 2 && variants.every((v) => v.name.length <= 12)) {
      return { kind: "sizes", parts: variants.map((v) => ({ name: v.name, price: formatPrice(v.priceCents, currency) })) };
    }
    return { kind: "from", text: `from ${formatPrice(Math.min(...variants.map((v) => v.priceCents)), currency)}` };
  }
  return priceCents === null ? null : { kind: "single", text: formatPrice(priceCents, currency) };
}
