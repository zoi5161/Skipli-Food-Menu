import { formatAddress } from "@/lib/menu/contact";
import { DIETARY_LABEL } from "@/lib/menu/format";
import { RichText } from "@/lib/menu/rich-text";
import { ContactButton } from "../contact-button";
import { isSizeList, PriceText } from "../price";
import { OpenStatusLine, ShareButton } from "../widgets";
import type { CategoryHeadingProps, HeaderProps, ItemRowProps, StyleKit } from "./types";

// Kiểu "Simple": chữ đen trên nền trắng, cỡ chữ lớn, không ảnh, không màu nhấn (giống menu chữ
// của SinglePlatform). Dễ đọc với khách lớn tuổi và quán không có ảnh món.

function Header({ restaurant: r, buttons, shareUrl }: HeaderProps) {
  const address = formatAddress(r);
  return (
    <header className="mx-auto max-w-3xl px-4 pt-10 text-center sm:pt-14">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{r.name}</h1>
      {r.tagline && <p className="mt-2 text-lg">{r.tagline}</p>}
      {(address || r.phone) && <p className="mt-3 text-[17px] text-neutral-700">{[address, r.phone].filter(Boolean).join(" · ")}</p>}
      {r.openingHours && <OpenStatusLine hours={r.openingHours} className="mt-3 justify-center text-base" />}
      {r.description && <RichText text={r.description} className="mx-auto mt-4 max-w-2xl space-y-2 text-left text-[17px] leading-relaxed text-neutral-800 sm:text-center" />}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {buttons.map((b, i) => (
          <ContactButton key={b.kind} link={b} shape="square" variant={i === 0 ? "primary" : "secondary"} className="h-12 px-5 text-base" />
        ))}
        <ShareButton url={shareUrl} title={r.name} className="flex h-12 w-12 items-center justify-center rounded-md border border-neutral-400" />
      </div>
    </header>
  );
}

function CategoryHeading({ category: c, serving }: CategoryHeadingProps) {
  return (
    <div className="border-y-2 border-black py-2 text-center">
      <h2 id={`h-${c.id}`} className="text-2xl font-bold tracking-wide uppercase">
        {c.name}
      </h2>
      {(serving || c.description) && (
        <p className="mt-0.5 text-[15px] text-neutral-700">
          {serving && <span className="font-semibold">{serving}</span>}
          {serving && c.description && " · "}
          {c.description}
        </p>
      )}
    </div>
  );
}

function ItemRow({ item, currency, onOpen }: ItemRowProps) {
  const sizesBelow = isSizeList(item.priceCents, item.variants, currency);
  const price = <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} separator=" / " nameClass="font-normal" />;
  const notes = [...(item.isFeatured ? ["Chef's pick"] : []), ...item.dietaryTags.map((t) => DIETARY_LABEL[t])];
  return (
    <button type="button" onClick={onOpen} className="group block w-full py-4 text-left">
      <span className="flex items-baseline justify-between gap-4">
        <span className="text-lg font-bold group-hover:underline">
          <span className={item.isSoldOut ? "line-through decoration-1" : ""}>{item.name}</span>
          {item.allergenCodes.length > 0 && <sup className="ml-1 text-[11px] font-normal">{item.allergenCodes.join(",")}</sup>}
        </span>
        {item.priceCents !== null && !sizesBelow && <span className="shrink-0 text-lg font-bold tabular-nums">{price}</span>}
      </span>
      {item.priceCents !== null && sizesBelow && <span className="block text-[17px] font-bold tabular-nums">{price}</span>}
      {item.isSoldOut && <span className="mt-0.5 block text-[15px] font-bold uppercase">Sold out today</span>}
      {item.description && <span className="mt-1 block text-[17px] leading-snug text-neutral-800">{item.description}</span>}
      {notes.length > 0 && <span className="mt-1 block text-[15px] text-neutral-700 italic">{notes.join(" · ")}</span>}
    </button>
  );
}

export const simpleStyle: StyleKit = {
  theme: {
    page: "bg-white text-black text-[17px]",
    line: "#d4d4d4",
    bar: "bg-white",
    tab: "font-semibold text-neutral-500 hover:text-black aria-[current=true]:text-black",
    chip: "rounded-md",
    input: "rounded-md border border-neutral-500 focus-within:ring-2 focus-within:ring-black",
    itemGrid: "grid-cols-1 md:grid-cols-2 md:gap-x-14",
    panel: "rounded-md border border-neutral-400",
    sectionTitle: "text-2xl font-bold tracking-wide uppercase",
    muted: "text-neutral-700",
    softButton: "rounded-md border border-neutral-500 hover:bg-neutral-100",
  },
  buttonShape: "square",
  showFeatured: false,
  sidebar: false,
  descriptionInHeader: true,
  monochrome: true,
  Header,
  CategoryHeading,
  ItemRow,
};
