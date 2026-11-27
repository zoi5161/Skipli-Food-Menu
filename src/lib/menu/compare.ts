// So sánh menu AI vừa đọc với menu đang có (màn hình duyệt), và nhắc món thiếu giá / giá $0.
// Không phụ thuộc database: dùng được ở trình duyệt, dễ viết test.
import { formatPrice, type Variant } from "./format";

export type PricedDish = { name: string; priceCents: number | null; variants: Variant[] };

/** Tên món để so trùng: bỏ hoa thường, dấu cách thừa, dấu tiếng Việt / tiếng Tây Ban Nha. */
export function dishKey(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Giá viết ra để so và hiện: "$12.50", hoặc "Small $11.00 / Large $16.00", hoặc "no price". */
export function priceLabel(d: Pick<PricedDish, "priceCents" | "variants">, currency = "USD"): string {
  const sizes = d.variants.length >= 2 ? d.variants : [];
  if (sizes.length) return sizes.map((v) => `${v.name} ${formatPrice(v.priceCents, currency)}`).join(" / ");
  const single = d.variants.length === 1 ? d.variants[0].priceCents : d.priceCents;
  return single === null ? "no price" : formatPrice(single, currency);
}

export type DishChange = { kind: "new" } | { kind: "same" } | { kind: "price"; from: string; to: string };

/** Món mới, món giữ nguyên, hay món đổi giá (so theo tên với menu đang có). */
export function compareDish(dish: PricedDish, current: Map<string, PricedDish>, currency = "USD"): DishChange {
  const old = current.get(dishKey(dish.name));
  if (!old) return { kind: "new" };
  const from = priceLabel(old, currency);
  const to = priceLabel(dish, currency);
  return from === to ? { kind: "same" } : { kind: "price", from, to };
}

export const currentIndex = (dishes: PricedDish[]) => new Map(dishes.map((d) => [dishKey(d.name), d]));

/** Món đang có mà menu mới không còn (sẽ bị xóa khi "thay cả menu"). */
export function removedDishes<T extends { name: string }>(current: T[], incoming: { name: string }[]): T[] {
  const keep = new Set(incoming.map((d) => dishKey(d.name)));
  return current.filter((d) => !keep.has(dishKey(d.name)));
}

/** Nhắc kiểm tra: món không có giá, hoặc giá $0 (kể cả một cỡ giá $0). Không có gì thì null. */
export function priceWarning(d: Pick<PricedDish, "priceCents" | "variants">): string | null {
  if (d.variants.length) return d.variants.some((v) => v.priceCents === 0) ? (d.variants.length === 1 ? "Price is $0" : "A size costs $0") : null;
  if (d.priceCents === null) return "No price";
  if (d.priceCents === 0) return "Price is $0";
  return null;
}
