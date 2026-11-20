"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DIETARY_LABEL, DIETARY_TAGS, formatPrice, formatServingTimes, type DietaryTagValue } from "@/lib/menu/format";
import type { PublicCategory, PublicItem } from "@/lib/menu/public";
import type { MenuStyleKey } from "@/lib/menu/styles";
import { PriceText } from "./price";
import { styleKit } from "./styles";
import { trackClick, trackView } from "./tracking";

// Phần có tương tác của trang khách: thanh danh mục dính trên đầu, tìm món, bộ lọc
// (chế độ ăn, ẩn món có chất gây dị ứng), dải "Chef's picks", danh sách món, bảng chi tiết món.
// Trang khách (trackSlug khác null) gửi lượt xem khi mở trang và lượt bấm khi mở chi tiết món.

type Allergen = { code: string; name: string };

export function MenuBrowser({
  categories,
  currency,
  allergens,
  menuStyle,
  trackSlug = null,
  aside,
  after,
}: {
  categories: PublicCategory[];
  currency: string;
  allergens: Allergen[];
  menuStyle: MenuStyleKey;
  /** Slug quán để ghi thống kê; null = không ghi (trang xem trước). */
  trackSlug?: string | null;
  /** Cột bên phải trên màn hình rộng (giờ mở cửa, địa chỉ). */
  aside?: ReactNode;
  /** Các mục dưới menu (địa chỉ, giới thiệu, liên hệ). */
  after?: ReactNode;
}) {
  const kit = styleKit(menuStyle);
  const t = kit.theme;
  const [query, setQuery] = useState("");
  const [diets, setDiets] = useState<DietaryTagValue[]>([]);
  const [hidden, setHidden] = useState<string[]>([]); // mã dị ứng khách muốn tránh
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openItem, setOpenItemState] = useState<PublicItem | null>(null);
  const setOpenItem = (item: PublicItem | null) => {
    if (item && trackSlug) trackClick(trackSlug, item.id);
    setOpenItemState(item);
  };
  useEffect(() => {
    if (trackSlug) trackView(trackSlug);
  }, [trackSlug]);

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const availableDiets = useMemo(() => {
    const used = new Set(allItems.flatMap((i) => i.dietaryTags));
    return DIETARY_TAGS.filter((d) => used.has(d));
  }, [allItems]);

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || diets.length > 0 || hidden.length > 0;
  const visible = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          items: c.items.filter(
            (i) =>
              (q === "" || `${i.name} ${i.description ?? ""}`.toLowerCase().includes(q)) &&
              diets.every((d) => i.dietaryTags.includes(d)) &&
              !i.allergenCodes.some((code) => hidden.includes(code)),
          ),
        }))
        .filter((c) => c.items.length > 0),
    [categories, q, diets, hidden],
  );
  const featured = useMemo(() => allItems.filter((i) => i.isFeatured && i.imageUrl).slice(0, 8), [allItems]);
  const activeId = useActiveSection(visible.map((c) => c.id));

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const clearAll = () => (setQuery(""), setDiets([]), setHidden([]));
  const filterCount = diets.length + hidden.length;

  if (categories.length === 0) {
    return <p className={`mx-auto mt-10 max-w-7xl p-6 text-center ${t.panel} ${t.muted}`}>The menu is being updated. Please check back soon.</p>;
  }

  const chip = (active: boolean) =>
    `shrink-0 border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${t.chip}` + (active ? "" : " hover:opacity-80");
  const chipStyle = (active: boolean) => (active ? { background: "var(--accent)", color: "var(--on-accent)", borderColor: "var(--accent)" } : { borderColor: t.line });

  return (
    <>
      {/* ── Thanh dính trên đầu: danh mục + tìm món + bộ lọc ── */}
      <div className={`sticky top-0 z-30 mt-8 border-b ${t.bar}`} style={{ borderColor: t.line }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 pt-2 sm:px-6 lg:flex-row lg:items-center lg:gap-6 lg:pt-0">
          <nav aria-label="Menu sections" className="order-2 -mx-4 flex flex-1 overflow-x-auto px-4 lg:order-1 lg:mx-0 lg:px-0" data-tabs>
            {visible.map((c) => (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                aria-current={activeId === c.id ? "true" : undefined}
                data-tab={c.id}
                className={`group relative shrink-0 px-3 py-3.5 whitespace-nowrap first:pl-0 lg:py-5 ${t.tab}`}
              >
                {c.name}
                {activeId === c.id && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-current group-first:left-0" aria-hidden />}
              </a>
            ))}
          </nav>
          <div className="order-1 flex gap-2 lg:order-2 lg:w-[27rem] lg:py-3">
            <label className={`flex h-11 flex-1 items-center gap-2 px-3.5 ${t.input}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="sr-only">Search dishes</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${allItems.length} dishes`}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:opacity-60"
              />
            </label>
            {(availableDiets.length > 0 || allergens.length > 0) && (
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-controls="menu-filters"
                className={`flex h-11 shrink-0 items-center gap-2 px-4 text-[15px] font-semibold ${t.softButton}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters
                {filterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs" style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
                    {filterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div id="menu-filters" className="mx-auto max-w-7xl space-y-3 px-4 pt-1 pb-4 sm:px-6">
            {availableDiets.length > 0 && (
              <div role="group" aria-label="Dietary filters" className="flex flex-wrap items-center gap-2">
                <span className={`mr-1 text-sm font-semibold ${t.muted}`}>Show only</span>
                {availableDiets.map((d) => (
                  <button key={d} type="button" aria-pressed={diets.includes(d)} onClick={() => setDiets((x) => toggle(x, d))} className={chip(diets.includes(d))} style={chipStyle(diets.includes(d))}>
                    {DIETARY_LABEL[d]}
                  </button>
                ))}
              </div>
            )}
            {allergens.length > 0 && (
              <div role="group" aria-label="Hide allergens" className="flex flex-wrap items-center gap-2">
                <span className={`mr-1 text-sm font-semibold ${t.muted}`}>Hide dishes with</span>
                {allergens.map((a) => (
                  <AllergenChip key={a.code} allergen={a} active={hidden.includes(a.code)} onClick={() => setHidden((x) => toggle(x, a.code))} chipClass={chip} chipStyle={chipStyle} />
                ))}
              </div>
            )}
            {filterCount > 0 && (
              <button type="button" onClick={() => (setDiets([]), setHidden([]))} className="text-sm font-semibold underline">
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 ${kit.sidebar && aside ? "lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14" : ""}`}>
        <div className="min-w-0">
          {/* ── Chef's picks ── */}
          {kit.showFeatured && !filtering && featured.length > 0 && (
            <section className="pt-10" aria-labelledby="chefs-picks">
              <h2 id="chefs-picks" className={t.sectionTitle}>
                Chef&apos;s picks
              </h2>
              <ul className="-mx-4 mt-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-4">
                {featured.map((item) => (
                  <li key={item.id} className="w-40 shrink-0 snap-start sm:w-auto">
                    <button type="button" onClick={() => setOpenItem(item)} className="group block w-full text-left">
                      {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên */}
                      <img src={item.imageUrl!} alt="" loading="lazy" className="aspect-square w-full rounded-2xl object-cover transition group-hover:brightness-95" />
                      <p className="mt-2.5 font-semibold group-hover:underline">{item.name}</p>
                      {item.priceCents !== null && (
                        <p className={`tabular-nums ${t.muted}`}>
                          <PriceText priceCents={item.priceCents} variants={item.variants} currency={currency} nameClass="" />
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Danh mục và món ── */}
          {visible.length === 0 ? (
            <div className={`mt-10 p-8 text-center ${t.panel}`}>
              <p className={t.muted}>No dishes match{q ? ` “${query.trim()}”` : " these filters"}.</p>
              <button type="button" onClick={clearAll} className="mt-2 font-semibold underline" style={{ color: "var(--accent)" }}>
                Show all dishes
              </button>
            </div>
          ) : (
            visible.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-36 pt-12 lg:scroll-mt-24" aria-labelledby={`h-${c.id}`} data-section={c.id}>
                <kit.CategoryHeading category={c} serving={formatServingTimes(c.servingDays, c.servingFrom, c.servingUntil)} count={c.items.length} />
                <ul className={`grid ${t.itemGrid} ${kit.itemDivider === false ? "mt-5" : "mt-2"}`}>
                  {c.items.map((item) => (
                    <li key={item.id} className={kit.itemDivider === false ? "" : "border-b"} style={kit.itemDivider === false ? undefined : { borderColor: t.line }}>
                      <kit.ItemRow item={item} currency={currency} onOpen={() => setOpenItem(item)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {/* ── Dị ứng: bấm để ẩn món ── */}
          {allergens.length > 0 && (
            <section className="pt-14" aria-labelledby="allergen-key">
              <h2 id="allergen-key" className={t.sectionTitle}>
                Allergens
              </h2>
              <p className={`mt-1 ${t.muted}`}>Tap one to hide the dishes that contain it. Please tell the team about any allergy before ordering.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {allergens.map((a) => (
                  <AllergenChip key={a.code} allergen={a} active={hidden.includes(a.code)} onClick={() => setHidden((x) => toggle(x, a.code))} chipClass={chip} chipStyle={chipStyle} />
                ))}
              </div>
            </section>
          )}

          {after}
        </div>

        {kit.sidebar && aside && (
          <aside className="hidden pt-10 lg:block" aria-label="Hours and location">
            <div className="sticky top-28">{aside}</div>
          </aside>
        )}
      </div>

      {openItem && <ItemSheet item={openItem} currency={currency} allergens={allergens} onClose={() => setOpenItem(null)} />}
    </>
  );
}

function AllergenChip({
  allergen: a,
  active,
  onClick,
  chipClass,
  chipStyle,
}: {
  allergen: Allergen;
  active: boolean;
  onClick: () => void;
  chipClass: (active: boolean) => string;
  chipStyle: (active: boolean) => React.CSSProperties;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`${chipClass(active)} flex items-center gap-2 pl-1.5`} style={chipStyle(active)} title={active ? `Showing dishes without ${a.name}` : `Hide dishes with ${a.name}`}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 font-mono text-xs font-bold text-neutral-800">{a.code}</span>
      <span className={active ? "line-through" : ""}>{a.name}</span>
    </button>
  );
}

/** Danh mục đang xem (để gạch chân trên thanh danh mục): mục cuối cùng đã cuộn qua mép trên. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const list = key ? key.split(",") : [];
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = list[0] ?? null;
      for (const id of list) {
        const el = document.querySelector(`[data-section="${id}"]`);
        if (el && el.getBoundingClientRect().top <= 170) current = id;
      }
      // Cuộn tới cuối trang: chọn mục cuối
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && list.length) {
        const last = document.querySelector(`[data-section="${list[list.length - 1]}"]`);
        if (last && last.getBoundingClientRect().top < window.innerHeight) current = list[list.length - 1];
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [key]);

  // Giữ tab đang chọn nằm trong khung nhìn của thanh danh mục (cuộn ngang).
  useEffect(() => {
    if (!active) return;
    const tab = document.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    const bar = tab?.closest<HTMLElement>("[data-tabs]");
    if (!tab || !bar || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: Math.max(0, tab.offsetLeft - bar.offsetLeft - 16), behavior: "smooth" });
  }, [active]);

  return active && ids.includes(active) ? active : (ids[0] ?? null);
}

/** Bảng chi tiết món trượt lên từ dưới màn hình. */
function ItemSheet({ item, currency, allergens, onClose }: { item: PublicItem; currency: string; allergens: Allergen[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const allergenNames = item.allergenCodes.map((code) => allergens.find((a) => a.code === code)?.name).filter(Boolean);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="item-sheet-title"
      className="mx-auto mt-auto mb-0 w-full max-w-xl overflow-hidden rounded-t-3xl bg-white p-0 font-sans text-neutral-900 backdrop:bg-black/40 sm:mb-auto sm:rounded-3xl"
    >
      <div className="max-h-[88dvh] overflow-y-auto pb-8">
        {item.imageUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên */}
            <img src={item.imageUrl} alt={item.name} className="aspect-[4/3] w-full object-cover" />
            <CloseButton onClose={onClose} className="absolute top-3 right-3 bg-white/90 shadow-sm" />
          </div>
        ) : (
          <div className="flex justify-end px-3 pt-3">
            <CloseButton onClose={onClose} className="hover:bg-neutral-100" />
          </div>
        )}
        <div className="px-5 pt-4">
          <h2 id="item-sheet-title" className="text-2xl font-bold tracking-tight">
            {item.name}
          </h2>
          {item.variants.length > 0 ? (
            <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-200" aria-label="Sizes">
              {item.variants.map((v) => (
                <li key={v.name} className="flex justify-between px-4 py-2.5">
                  <span>{v.name}</span>
                  <span className="font-semibold tabular-nums">{formatPrice(v.priceCents, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            item.priceCents !== null && <p className="mt-1 text-lg font-semibold tabular-nums">{formatPrice(item.priceCents, currency)}</p>
          )}
          {item.isSoldOut && <p className="mt-2 inline-block rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">Sold out today</p>}
          {item.description && <p className="mt-3 leading-relaxed text-neutral-700">{item.description}</p>}

          {(item.isFeatured || item.dietaryTags.length > 0) && (
            <p className="mt-4 flex flex-wrap gap-1.5">
              {item.isFeatured && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">Chef&apos;s pick</span>}
              {item.dietaryTags.map((d) => (
                <span key={d} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {DIETARY_LABEL[d]}
                </span>
              ))}
            </p>
          )}

          {item.extras.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Extras</h3>
              <ul className="mt-2 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                {item.extras.map((x) => (
                  <li key={x.name} className="flex justify-between px-4 py-2.5 text-sm">
                    <span>{x.name}</span>
                    <span className="text-neutral-600 tabular-nums">+{formatPrice(x.priceCents, currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {allergenNames.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">Contains</h3>
              <p className="mt-1 text-sm text-neutral-700">{allergenNames.join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

function CloseButton({ onClose, className = "" }: { onClose: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close" className={`flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 ${className}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}
