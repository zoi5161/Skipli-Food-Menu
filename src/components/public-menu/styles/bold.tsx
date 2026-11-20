import type { CSSProperties } from "react";
import { DIETARY_LABEL } from "@/lib/menu/format";
import { ContactButton } from "../contact-button";
import { PriceText } from "../price";
import { OpenStatusLine, ShareButton } from "../widgets";
import type { CategoryHeadingProps, HeaderProps, ItemRowProps, StyleKit } from "./types";

// Kiểu "Bold": kiểu quán đường phố. Dải màu nhấn lớn ở đầu trang, tên quán chữ in hoa thật đậm,
// giá nằm trong ô màu nhấn. Hợp quán taco, food truck, burger.

const LINE = "#eadfcd";

function Header({ restaurant: r, buttons, shareUrl }: HeaderProps) {
  return (
    <header>
      <div className="h-44 overflow-hidden sm:h-72" style={{ background: "color-mix(in srgb, var(--accent) 70%, black)" }}>
        {r.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
          <img src={r.coverUrl} alt="" className="h-full w-full object-cover" fetchPriority="high" />
        )}
      </div>
      {/* Dải màu nhấn: chữ và viền nút theo màu chữ đọc được trên nền nhấn */}
      <div style={{ background: "var(--accent)", color: "var(--on-accent)", "--line": "currentColor" } as CSSProperties}>
        <div className="mx-auto max-w-7xl px-4 pb-7 sm:px-6">
          <div
            className="relative -mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 bg-white text-3xl font-black sm:-mt-14 sm:h-28 sm:w-28"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            {r.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
              <img src={r.logoUrl} alt={`${r.name} logo`} className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>{r.name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <h1 className="mt-3 text-4xl leading-[0.95] font-black tracking-tight uppercase sm:text-6xl">{r.name}</h1>
          {r.tagline && <p className="mt-2 text-lg font-semibold opacity-90">{r.tagline}</p>}
          {r.openingHours && <OpenStatusLine hours={r.openingHours} className="mt-3 lg:hidden" />}
          <div className="mt-5 flex flex-wrap gap-2">
            {buttons.map((b, i) => (
              <ContactButton key={b.kind} link={b} variant="secondary" className={`h-11 border-2 px-5 font-bold ${i === 0 ? "bg-white text-neutral-950" : ""}`} />
            ))}
            <ShareButton url={shareUrl} title={r.name} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-current" />
          </div>
        </div>
      </div>
    </header>
  );
}

function CategoryHeading({ category: c, serving }: CategoryHeadingProps) {
  return (
    <div>
      <h2 id={`h-${c.id}`} className="text-3xl font-black tracking-tight uppercase sm:text-4xl">
        {c.name}
      </h2>
      <span className="mt-1.5 block h-1.5 w-14 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />
      {serving && (
        <p className="mt-2 text-sm font-bold tracking-wide uppercase" style={{ color: "var(--accent)" }}>
          {serving}
        </p>
      )}
      {c.description && <p className="mt-1 text-neutral-600">{c.description}</p>}
    </div>
  );
}

function ItemRow({ item, currency, onOpen }: ItemRowProps) {
  return (
    <button type="button" onClick={onOpen} className="group flex w-full gap-4 py-5 text-left">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
        <img src={item.imageUrl} alt="" loading="lazy" className={`h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28 ${item.isSoldOut ? "grayscale" : ""}`} />
      )}
      <div className={`min-w-0 flex-1 ${item.isSoldOut ? "opacity-55" : ""}`}>
        <p className="text-lg leading-tight font-extrabold tracking-tight uppercase group-hover:underline">
          {item.name}
          {item.allergenCodes.length > 0 && <sup className="ml-1 text-[11px] font-normal text-neutral-500 normal-case">{item.allergenCodes.join(",")}</sup>}
        </p>
        {item.description && <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-neutral-600">{item.description}</p>}
        <p className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.priceCents !== null && (
            <span className="inline-flex flex-wrap gap-x-1 rounded-lg px-2.5 py-1 text-[15px] font-black tabular-nums" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} nameClass="font-semibold opacity-85" />
            </span>
          )}
          {item.isSoldOut && <span className="rounded-lg bg-neutral-950 px-2.5 py-1 text-xs font-bold text-white uppercase">Sold out</span>}
          {item.isFeatured && (
            <span className="px-1 text-xs font-extrabold tracking-wide uppercase" style={{ color: "var(--accent)" }}>
              ★ Chef&apos;s pick
            </span>
          )}
          {item.dietaryTags.map((t) => (
            <span key={t} className="rounded-lg border-2 px-2 py-0.5 text-[11px] font-bold tracking-wide text-neutral-700 uppercase" style={{ borderColor: LINE }}>
              {DIETARY_LABEL[t]}
            </span>
          ))}
        </p>
      </div>
    </button>
  );
}

export const boldStyle: StyleKit = {
  theme: {
    page: "bg-[#fffaf2] text-neutral-950",
    line: LINE,
    bar: "bg-[#fffaf2]",
    tab: "text-sm font-extrabold tracking-wide uppercase text-neutral-500 hover:text-neutral-950 aria-[current=true]:text-neutral-950",
    chip: "rounded-full font-bold",
    input: "rounded-full bg-white ring-1 ring-[#eadfcd] focus-within:ring-2 focus-within:ring-neutral-400",
    itemGrid: "grid-cols-1 md:grid-cols-2 md:gap-x-10",
    panel: "rounded-3xl bg-white ring-1 ring-[#eadfcd]",
    sectionTitle: "text-3xl font-black tracking-tight uppercase sm:text-4xl",
    muted: "text-neutral-600",
    softButton: "rounded-full bg-white font-bold ring-1 ring-[#eadfcd] hover:bg-neutral-50",
  },
  buttonShape: "pill",
  showFeatured: true,
  sidebar: true,
  descriptionInHeader: false,
  Header,
  CategoryHeading,
  ItemRow,
};
