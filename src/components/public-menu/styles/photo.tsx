import { DIETARY_LABEL } from "@/lib/menu/format";
import { ContactButton } from "../contact-button";
import { PriceText } from "../price";
import { OpenStatusLine, ShareButton } from "../widgets";
import type { CategoryHeadingProps, HeaderProps, ItemRowProps, StyleKit } from "./types";

// Kiểu "Modern": ảnh bìa lớn, logo nổi, món 2 cột có ảnh vuông bên phải, dải "Chef's picks".

function Header({ restaurant: r, buttons, shareUrl }: HeaderProps) {
  return (
    <header className="mx-auto max-w-7xl sm:px-6">
      {/* Ảnh bìa (hoặc dải màu nhấn khi chưa có ảnh) */}
      <div className="relative h-44 overflow-hidden sm:mt-6 sm:h-64 sm:rounded-3xl lg:h-80" style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, black))" }}>
        {r.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
          <img src={r.coverUrl} alt="" className="h-full w-full object-cover" fetchPriority="high" />
        )}
      </div>

      <div className="px-4 sm:px-0 lg:flex lg:items-end lg:gap-6">
        <div className="relative z-10 -mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white text-4xl font-bold shadow-sm sm:-mt-16 sm:h-32 sm:w-32" style={{ color: "var(--accent)" }}>
          {r.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
            <img src={r.logoUrl} alt={`${r.name} logo`} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>{r.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="mt-3 min-w-0 flex-1 lg:mt-0 lg:pb-1">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{r.name}</h1>
          {r.tagline && <p className="mt-1.5 text-base text-neutral-600 sm:text-lg">{r.tagline}</p>}
          {r.openingHours && <OpenStatusLine hours={r.openingHours} className="mt-2 lg:hidden" />}
        </div>

        <div className="mt-4 flex gap-2 lg:mt-0 lg:shrink-0 lg:pb-1">
          <ShareButton url={shareUrl} title={r.name} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200" />
          {/* Nút chính (màu nhấn) nằm ngoài cùng bên phải, giống 1FoodMenu */}
          {[...buttons].reverse().map((b, i, all) => (
            <ContactButton key={b.kind} link={b} variant={i === all.length - 1 ? "primary" : "secondary"} className="h-11 flex-1 border-transparent bg-neutral-100 lg:flex-none lg:px-5" />
          ))}
        </div>
      </div>
    </header>
  );
}

function CategoryHeading({ category: c, serving, count }: CategoryHeadingProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`h-${c.id}`} className="text-2xl font-bold tracking-tight sm:text-[28px]">
          {c.name}
        </h2>
        <span className="shrink-0 text-sm text-neutral-500">
          {count} {count === 1 ? "dish" : "dishes"}
        </span>
      </div>
      {serving && (
        <p className="mt-1 text-sm font-semibold" style={{ color: "var(--accent)" }}>
          {serving}
        </p>
      )}
      {c.description && <p className="mt-1 text-neutral-600">{c.description}</p>}
    </div>
  );
}

function ItemRow({ item, currency, onOpen }: ItemRowProps) {
  return (
    <button type="button" onClick={onOpen} className="group flex h-full w-full gap-4 py-5 text-left">
      <div className={`min-w-0 flex-1 ${item.isSoldOut ? "opacity-55" : ""}`}>
        <p className="text-[17px] font-semibold group-hover:underline">
          {item.name}
          {item.allergenCodes.length > 0 && <sup className="ml-1 text-[11px] font-normal text-neutral-500">{item.allergenCodes.join(",")}</sup>}
        </p>
        {item.description && <p className="mt-1 line-clamp-2 text-[15px] leading-snug text-neutral-600">{item.description}</p>}
        <p className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.priceCents !== null && (
            <span className="mr-1 font-semibold tabular-nums">
              <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} />
            </span>
          )}
          {item.isSoldOut && <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs font-semibold text-white">Sold out</span>}
          {item.isFeatured && <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">Chef&apos;s pick</span>}
          {item.dietaryTags.map((t) => (
            <span key={t} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
              {DIETARY_LABEL[t]}
            </span>
          ))}
        </p>
      </div>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
        <img src={item.imageUrl} alt="" loading="lazy" className={`h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28 ${item.isSoldOut ? "grayscale" : ""}`} />
      )}
    </button>
  );
}

export const photoStyle: StyleKit = {
  theme: {
    page: "bg-white text-neutral-900",
    line: "#e5e5e5",
    bar: "bg-white",
    tab: "text-neutral-500 hover:text-neutral-900 aria-[current=true]:text-neutral-900",
    chip: "rounded-full",
    input: "rounded-2xl bg-neutral-100 focus-within:ring-2 focus-within:ring-neutral-300",
    itemGrid: "grid-cols-1 md:grid-cols-2 md:gap-x-10",
    panel: "rounded-3xl border border-neutral-200",
    sectionTitle: "text-2xl font-bold tracking-tight sm:text-[28px]",
    muted: "text-neutral-600",
    softButton: "rounded-full bg-neutral-100 hover:bg-neutral-200",
  },
  buttonShape: "pill",
  showFeatured: true,
  sidebar: true,
  descriptionInHeader: false,
  Header,
  CategoryHeading,
  ItemRow,
};
