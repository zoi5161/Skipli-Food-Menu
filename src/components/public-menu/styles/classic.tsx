import { DIETARY_LABEL } from "@/lib/menu/format";
import { formatDayHours, DAY_NAMES, WEEK_FROM_MONDAY } from "@/lib/menu/hours";
import { RichText } from "@/lib/menu/rich-text";
import { ContactButton } from "../contact-button";
import { PriceText } from "../price";
import { OpenStatusLine, ShareButton } from "../widgets";
import type { CategoryHeadingProps, HeaderProps, ItemRowProps, StyleKit } from "./types";

// Kiểu "Classic": giống menu in trên giấy. Nền kem, chữ có chân, tên quán thật lớn,
// tên món ……… giá trên một dòng, món chia 2 cột trên màn hình rộng. Không cần ảnh món.

function Header({ restaurant: r, buttons, shareUrl }: HeaderProps) {
  return (
    <header className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-16">
      <div>
        <p className="flex items-center gap-3 font-sans text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--accent)" }}>
          {r.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
            <img src={r.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          )}
          {[r.city, r.region].filter(Boolean).join(", ") || "Menu"}
        </p>
        <h1 className="mt-3 text-5xl leading-[1.02] font-medium tracking-tight sm:text-7xl">{r.name}</h1>
        {r.tagline && <p className="mt-4 text-xl italic opacity-80">{r.tagline}</p>}
        {r.description && <RichText text={r.description} className="mt-4 max-w-2xl space-y-2 font-sans text-[17px] leading-relaxed opacity-80" />}
        {r.openingHours && <OpenStatusLine hours={r.openingHours} className="mt-4 font-sans lg:hidden" />}

        <div className="mt-6 flex flex-wrap gap-2 font-sans">
          {buttons.map((b, i) => (
            <ContactButton key={b.kind} link={b} shape="square" variant={i === 0 ? "primary" : "secondary"} />
          ))}
          <ShareButton url={shareUrl} title={r.name} className="flex h-[42px] w-[42px] items-center justify-center rounded-md border" />
        </div>
      </div>

      {r.openingHours && (
        <aside className="mt-10 hidden border-t-2 pt-5 font-sans lg:mt-2 lg:block" style={{ borderColor: "currentColor" }} aria-label="Opening hours">
          <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "var(--accent)" }}>
            Hours
          </p>
          <OpenStatusLine hours={r.openingHours} className="mt-2" />
          <dl className="mt-3 text-[15px]">
            {WEEK_FROM_MONDAY.map((d) => (
              <div key={d} className="flex justify-between border-b border-[#e3dbcd] py-2">
                <dt className="opacity-75">{DAY_NAMES[d]}</dt>
                <dd className="font-semibold tabular-nums">{formatDayHours(r.openingHours![d])}</dd>
              </div>
            ))}
          </dl>
        </aside>
      )}
    </header>
  );
}

function CategoryHeading({ category: c, serving }: CategoryHeadingProps) {
  return (
    <div className="border-b-2 pb-3" style={{ borderColor: "currentColor" }}>
      <h2 id={`h-${c.id}`} className="text-3xl font-medium sm:text-4xl">
        {c.name}
      </h2>
      {(serving || c.description) && (
        <p className="mt-1 font-sans text-sm opacity-70">
          {serving && <span className="font-semibold" style={{ color: "var(--accent)" }}>{serving}</span>}
          {serving && c.description && " · "}
          {c.description}
        </p>
      )}
    </div>
  );
}

function ItemRow({ item, currency, onOpen }: ItemRowProps) {
  const notes = item.dietaryTags.map((t) => DIETARY_LABEL[t]);
  return (
    <button type="button" onClick={onOpen} className={`group block w-full py-4 text-left ${item.isSoldOut ? "opacity-55" : ""}`}>
      {/* Tên món ……… giá */}
      <span className="flex items-baseline gap-2">
        <span className="text-xl font-semibold group-hover:underline">
          <span className={item.isSoldOut ? "line-through decoration-1" : ""}>{item.name}</span>
          {item.allergenCodes.length > 0 && <sup className="ml-1 font-sans text-[10px] font-normal opacity-60">{item.allergenCodes.join(",")}</sup>}
        </span>
        {item.priceCents !== null && (
          <>
            <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted opacity-30" aria-hidden />
            <span className="shrink-0 text-xl font-semibold tabular-nums">
              <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} separator=" / " nameClass="font-sans text-sm font-normal opacity-70" />
            </span>
          </>
        )}
      </span>
      {item.description && <span className="mt-1 block pr-12 font-sans text-[15px] leading-snug opacity-75">{item.description}</span>}
      {(item.isSoldOut || item.isFeatured || notes.length > 0) && (
        <span className="mt-1.5 flex flex-wrap gap-1.5 font-sans text-[11px] font-semibold tracking-wide uppercase">
          {item.isSoldOut && <span className="rounded-sm bg-current px-1.5 py-px"><span className="text-[#f6f1e9]">Sold out</span></span>}
          {item.isFeatured && <span style={{ color: "var(--accent)" }}>★ Chef&apos;s pick</span>}
          {notes.map((n) => (
            <span key={n} className="rounded-sm border border-current px-1.5 py-px opacity-70">
              {n}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export const classicStyle: StyleKit = {
  theme: {
    page: "bg-[#f6f1e9] font-serif text-[#2b211b]",
    line: "#ddd3c3",
    bar: "bg-[#f6f1e9]",
    tab: "font-sans text-[15px] font-semibold opacity-60 hover:opacity-100 aria-[current=true]:opacity-100",
    chip: "rounded-full font-sans",
    input: "rounded-md border border-[#ddd3c3] bg-[#fbf8f2] font-sans focus-within:ring-2 focus-within:ring-[#ddd3c3]",
    itemGrid: "md:grid-cols-2 md:gap-x-14",
    panel: "rounded-md border border-[#ddd3c3] bg-[#fbf8f2]",
    sectionTitle: "text-3xl font-medium sm:text-4xl",
    muted: "opacity-75",
    softButton: "rounded-md border border-[#ddd3c3] bg-[#fbf8f2] font-sans hover:bg-white",
  },
  buttonShape: "square",
  showFeatured: false,
  sidebar: false,
  descriptionInHeader: true,
  Header,
  CategoryHeading,
  ItemRow,
};
