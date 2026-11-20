import { DIETARY_LABEL } from "@/lib/menu/format";
import { ContactButton } from "../contact-button";
import { isSizeList, PriceText } from "../price";
import { OpenStatusLine, ShareButton } from "../widgets";
import type { CategoryHeadingProps, HeaderProps, ItemRowProps, StyleKit } from "./types";

// Kiểu "Dark": nền tối, chữ có chân, ảnh bìa lớn mờ dần vào nền. Hợp pizza buổi tối, bar, nhà hàng sang.
// Màu nhấn được pha sáng thêm để đọc rõ trên nền tối (màu nhấn đậm như xanh navy vẫn nhìn thấy).

const BG = "#0f0f0f";
const LIGHT_ACCENT = "color-mix(in srgb, var(--accent) 45%, white)";

function Header({ restaurant: r, buttons, shareUrl }: HeaderProps) {
  return (
    <header>
      <div className="relative h-80 overflow-hidden sm:h-[28rem]" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 60%, black), #000)" }}>
        {r.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
          <img src={r.coverUrl} alt="" className="h-full w-full object-cover" fetchPriority="high" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${BG} 0%, rgb(15 15 15 / 0.7) 45%, rgb(0 0 0 / 0.15) 100%)` }} aria-hidden />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 pb-6 sm:px-6">
          {r.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
            <img src={r.logoUrl} alt={`${r.name} logo`} className="h-16 w-16 rounded-full object-cover ring-2 ring-white/25 sm:h-20 sm:w-20" />
          )}
          {(r.city || r.region) && (
            <p className="mt-4 text-xs font-semibold tracking-[0.25em] uppercase" style={{ color: LIGHT_ACCENT }}>
              {[r.city, r.region].filter(Boolean).join(", ")}
            </p>
          )}
          <h1 className="mt-2 font-serif text-5xl leading-[1.02] sm:text-7xl">{r.name}</h1>
          {r.tagline && <p className="mt-2 font-serif text-lg text-neutral-300 italic sm:text-xl">{r.tagline}</p>}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {r.openingHours && <OpenStatusLine hours={r.openingHours} className="lg:hidden" />}
        <div className="mt-4 flex flex-wrap gap-2">
          {buttons.map((b, i) => (
            <ContactButton key={b.kind} link={b} variant={i === 0 ? "primary" : "secondary"} className="h-11 px-5" />
          ))}
          <ShareButton url={shareUrl} title={r.name} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/15" />
        </div>
      </div>
    </header>
  );
}

function CategoryHeading({ category: c, serving }: CategoryHeadingProps) {
  return (
    <div>
      {serving && (
        <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: LIGHT_ACCENT }}>
          {serving}
        </p>
      )}
      <h2 id={`h-${c.id}`} className="mt-1 font-serif text-3xl sm:text-4xl">
        {c.name}
      </h2>
      {c.description && <p className="mt-1 text-neutral-400">{c.description}</p>}
    </div>
  );
}

function ItemRow({ item, currency, onOpen }: ItemRowProps) {
  const sizesBelow = isSizeList(item.priceCents, item.variants, currency);
  const price = <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} nameClass="font-normal text-neutral-400" />;
  const notes = item.dietaryTags.map((t) => DIETARY_LABEL[t]);
  return (
    <button type="button" onClick={onOpen} className="group flex w-full items-start gap-4 py-5 text-left">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
        <img src={item.imageUrl} alt="" loading="lazy" className={`h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24 ${item.isSoldOut ? "grayscale" : ""}`} />
      )}
      <div className={`min-w-0 flex-1 ${item.isSoldOut ? "opacity-50" : ""}`}>
        <div className="flex items-baseline gap-3">
          <p className="font-serif text-xl leading-snug group-hover:underline">
            <span className={item.isSoldOut ? "line-through decoration-1" : ""}>{item.name}</span>
            {item.allergenCodes.length > 0 && <sup className="ml-1 font-sans text-[10px] text-neutral-500">{item.allergenCodes.join(",")}</sup>}
          </p>
          {item.priceCents !== null && !sizesBelow && (
            <>
              <span className="min-w-6 flex-1 -translate-y-1 border-b border-dotted border-white/25" aria-hidden />
              <span className="shrink-0 font-semibold tabular-nums" style={{ color: LIGHT_ACCENT }}>
                {price}
              </span>
            </>
          )}
        </div>
        {item.priceCents !== null && sizesBelow && (
          <p className="mt-0.5 font-semibold tabular-nums" style={{ color: LIGHT_ACCENT }}>
            {price}
          </p>
        )}
        {item.description && <p className="mt-1 text-[15px] leading-snug text-neutral-400">{item.description}</p>}
        {(item.isSoldOut || item.isFeatured || notes.length > 0) && (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            {item.isSoldOut && <span className="text-white">Sold out</span>}
            {item.isFeatured && <span style={{ color: LIGHT_ACCENT }}>★ Chef&apos;s pick</span>}
            {notes.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </p>
        )}
      </div>
    </button>
  );
}

export const darkStyle: StyleKit = {
  theme: {
    page: `bg-[#0f0f0f] text-neutral-100`,
    line: "#2b2b2b",
    bar: "bg-[#0f0f0f]",
    tab: "text-neutral-400 hover:text-white aria-[current=true]:text-white",
    chip: "rounded-full",
    input: "rounded-xl bg-white/[0.07] ring-1 ring-white/10 focus-within:ring-white/30",
    itemGrid: "grid-cols-1 md:grid-cols-2 md:gap-x-12",
    panel: "rounded-2xl border border-white/10 bg-white/[0.03]",
    sectionTitle: "font-serif text-3xl sm:text-4xl",
    muted: "text-neutral-400",
    softButton: "rounded-full bg-white/10 hover:bg-white/15",
  },
  buttonShape: "pill",
  showFeatured: true,
  sidebar: true,
  descriptionInHeader: false,
  Header,
  CategoryHeading,
  ItemRow,
};
