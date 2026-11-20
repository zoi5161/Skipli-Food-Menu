import { DIETARY_LABEL } from "@/lib/menu/format";
import { ContactButton } from "../contact-button";
import { PriceText } from "../price";
import { OpenStatusLine, ShareButton } from "../widgets";
import type { CategoryHeadingProps, HeaderProps, ItemRowProps, StyleKit } from "./types";

// Kiểu "Grid": lưới ảnh kiểu Instagram, 2 món mỗi hàng trên điện thoại. Đầu trang như trang cá nhân:
// ảnh bìa, logo tròn ở giữa. Món chưa có ảnh hiện chữ cái đầu trên nền màu nhấn nhạt.
// Hợp cafe, tiệm bánh, trà sữa.

function Header({ restaurant: r, buttons, shareUrl }: HeaderProps) {
  return (
    <header className="text-center">
      <div className="mx-auto max-w-7xl sm:px-6">
        <div className="h-36 overflow-hidden sm:mt-6 sm:h-56 sm:rounded-3xl" style={{ background: "color-mix(in srgb, var(--accent) 20%, white)" }}>
          {r.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
            <img src={r.coverUrl} alt="" className="h-full w-full object-cover" fetchPriority="high" />
          )}
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4">
        <div className="relative mx-auto -mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-4xl font-bold shadow-sm" style={{ color: "var(--accent)" }}>
          {r.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
            <img src={r.logoUrl} alt={`${r.name} logo`} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{r.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{r.name}</h1>
        {r.tagline && <p className="mt-1 text-neutral-600">{r.tagline}</p>}
        {r.openingHours && <OpenStatusLine hours={r.openingHours} className="mt-2 justify-center lg:hidden" />}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {buttons.map((b, i) => (
            <ContactButton key={b.kind} link={b} variant={i === 0 ? "primary" : "secondary"} className={`h-11 px-5 ${i === 0 ? "" : "border-transparent bg-neutral-100"}`} />
          ))}
          <ShareButton url={shareUrl} title={r.name} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200" />
        </div>
      </div>
    </header>
  );
}

function CategoryHeading({ category: c, serving, count }: CategoryHeadingProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`h-${c.id}`} className="text-2xl font-bold tracking-tight">
          {c.name}
        </h2>
        <span className="shrink-0 text-sm text-neutral-500">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      {serving && (
        <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
          {serving}
        </p>
      )}
      {c.description && <p className="mt-0.5 text-sm text-neutral-600">{c.description}</p>}
    </div>
  );
}

function ItemRow({ item, currency, onOpen }: ItemRowProps) {
  const notes = item.dietaryTags.map((t) => DIETARY_LABEL[t]);
  return (
    <button type="button" onClick={onOpen} className="group relative block w-full text-left">
      <span className="relative block aspect-square overflow-hidden rounded-2xl" style={{ background: "color-mix(in srgb, var(--accent) 12%, white)" }}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
          <img src={item.imageUrl} alt="" loading="lazy" className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${item.isSoldOut ? "grayscale" : ""}`} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-4xl font-bold opacity-60" style={{ color: "var(--accent)" }} aria-hidden>
            {item.name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <span className={`mt-2 block ${item.isSoldOut ? "opacity-55" : ""}`}>
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold group-hover:underline">
          {item.name}
          {item.allergenCodes.length > 0 && <sup className="ml-1 text-[10px] font-normal text-neutral-500">{item.allergenCodes.join(",")}</sup>}
        </span>
        {item.priceCents !== null && (
          <span className="mt-0.5 block text-sm font-semibold tabular-nums text-neutral-800">
            <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} />
          </span>
        )}
        {notes.length > 0 && <span className="mt-0.5 block text-xs text-neutral-500">{notes.join(" · ")}</span>}
      </span>
      {/* Nhãn ở góc ảnh; đặt cuối để trình đọc màn hình đọc tên món trước */}
      {(item.isSoldOut || item.isFeatured) && (
        <span className={`absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${item.isSoldOut ? "bg-neutral-900 text-white" : "bg-white/90 text-neutral-900"}`}>
          {item.isSoldOut ? "Sold out" : "★ Chef's pick"}
        </span>
      )}
    </button>
  );
}

export const gridStyle: StyleKit = {
  theme: {
    page: "bg-white text-neutral-900",
    line: "#e8e8e8",
    bar: "bg-white",
    tab: "text-neutral-500 hover:text-neutral-900 aria-[current=true]:text-neutral-900",
    chip: "rounded-full",
    input: "rounded-full bg-neutral-100 focus-within:ring-2 focus-within:ring-neutral-300",
    itemGrid: "grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5",
    panel: "rounded-3xl border border-neutral-200",
    sectionTitle: "text-2xl font-bold tracking-tight",
    muted: "text-neutral-600",
    softButton: "rounded-full bg-neutral-100 hover:bg-neutral-200",
  },
  buttonShape: "pill",
  showFeatured: false, // món đã có ảnh lớn, không cần dải Chef's picks riêng
  sidebar: true,
  descriptionInHeader: false,
  itemDivider: false,
  Header,
  CategoryHeading,
  ItemRow,
};
