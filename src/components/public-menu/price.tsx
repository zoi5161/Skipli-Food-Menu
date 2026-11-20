import { priceDisplay, type Variant } from "@/lib/menu/format";

// Hiện giá món trên trang khách: "$12.00", "Glass $10.00 · Bottle $36.00" hoặc "from $4.00".

export function PriceText({
  priceCents,
  variants,
  currency,
  separator = " · ",
  nameClass = "font-normal opacity-70",
}: {
  priceCents: number | null;
  variants: Variant[];
  currency: string;
  separator?: string;
  nameClass?: string;
}) {
  const d = priceDisplay(priceCents, variants, currency);
  if (!d) return null;
  if (d.kind === "sizes") {
    return (
      <>
        {d.parts.map((p, i) => (
          <span key={p.name} className="whitespace-nowrap">
            {i > 0 && <span className={nameClass}>{separator}</span>}
            <span className={nameClass}>{p.name} </span>
            {p.price}
          </span>
        ))}
      </>
    );
  }
  if (d.kind === "from") {
    return (
      <span className="whitespace-nowrap">
        <span className={nameClass}>from </span>
        {d.text.replace(/^from /, "")}
      </span>
    );
  }
  return <>{d.text}</>;
}

/** Giá dạng "Regular $13.50 / Large $15.50": dài, nhiều kiểu menu đặt trên dòng riêng dưới tên món. */
export function isSizeList(priceCents: number | null, variants: Variant[], currency: string): boolean {
  return priceDisplay(priceCents, variants, currency)?.kind === "sizes";
}
