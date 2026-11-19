"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { GalleryField, ImageField } from "@/components/image-upload";
import { QrCard } from "@/components/qr-card";
import { Button, Field, Toggle, ToastProvider, cx, inputClass, useToast } from "@/components/ui";
import { ACCENT_PRESETS, isHexColor } from "@/lib/menu/color";
import { CONTACT_LABEL, CONTACT_ORDER, type ContactChoice } from "@/lib/menu/contact";
import { DAY_NAMES, WEEK_FROM_MONDAY, defaultHours, type WeekHours } from "@/lib/menu/hours";
import { US_TIME_ZONES } from "@/lib/timezones";
import { MENU_STYLES, MENU_STYLE_INFO, type MenuStyleKey } from "@/lib/menu/styles";
import { changeSlug, saveAccentColor, saveButtons, saveGeneral, saveLocation, saveMenuStyle, saveSeo, setPublished, type SettingsResult } from "../actions";
import { SETTINGS_TABS, SETTINGS_TAB_LABEL, type SettingsData, type SettingsTab } from "../tabs";

export function SettingsEditor({ data, tab }: { data: SettingsData; tab: SettingsTab }) {
  return (
    <ToastProvider>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Settings sections">
          {SETTINGS_TABS.map((t) => (
            <Link
              key={t}
              href={t === "general" ? "/dashboard/settings" : `/dashboard/settings?tab=${t}`}
              aria-current={t === tab ? "page" : undefined}
              className={cx("rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap", t === tab ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200/60")}
            >
              {SETTINGS_TAB_LABEL[t]}
            </Link>
          ))}
        </nav>
        {tab === "general" && <GeneralTab data={data} />}
        {tab === "location" && <LocationTab data={data} />}
        {tab === "page" && <PageTab data={data} />}
        {tab === "design" && <DesignTab data={data} />}
        {tab === "buttons" && <ButtonsTab data={data} />}
      </div>
    </ToastProvider>
  );
}

// ── Dùng chung ───────────────────────────────────────

function useSaver() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  function save(action: () => Promise<SettingsResult>, message = "Saved", onDone?: (r: SettingsResult) => void) {
    startTransition(async () => {
      const r = await action().catch(() => ({ ok: false as const, error: "Could not save. Check your connection and try again." }));
      if (r.ok) toast(message);
      else toast(r.error, "error");
      onDone?.(r);
    });
  }
  return { save, pending };
}

function Card({ title, text, children, footer }: { title?: string; text?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white">
      <div className="space-y-5 p-5 sm:p-6">
        {title && (
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {text && <p className="mt-0.5 text-sm text-neutral-600">{text}</p>}
          </div>
        )}
        {children}
      </div>
      {footer && <div className="flex justify-end border-t border-neutral-100 px-5 py-4 sm:px-6">{footer}</div>}
    </section>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return <span className={cx("font-mono text-xs", value.length > max ? "text-red-600" : "text-neutral-400")}>{value.length} / {max}</span>;
}

const v = (s: string | null) => s ?? "";

// ── General ──────────────────────────────────────────

const COUNTRIES: Array<[string, string]> = [
  ["US", "United States"],
  ["CA", "Canada"],
  ["MX", "Mexico"],
  ["GB", "United Kingdom"],
  ["AU", "Australia"],
  ["VN", "Vietnam"],
];

function GeneralTab({ data }: { data: SettingsData }) {
  const [f, setF] = useState({
    name: data.name,
    tagline: v(data.tagline),
    description: v(data.description),
    country: data.country,
    currency: data.currency,
    googleMapsUrl: v(data.googleMapsUrl),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { save, pending } = useSaver();

  return (
    <>
      <Card title="Logo and photos" text="Photos make your page feel like your place. Large photos are made smaller automatically.">
        <ImageField target="logo" url={data.logoUrl} label="Logo" hint="Square works best. Without one, your page shows your first letter." />
        <ImageField target="cover" url={data.coverUrl} label="Cover photo" hint="Goes across the top of your page. Wide photos (landscape) look best." shape="wide" />
        <div className="border-t border-neutral-100 pt-5">
          <p className="mb-3 font-medium">About photos</p>
          <GalleryField urls={data.galleryUrls} />
        </div>
      </Card>

      <Card
        footer={
          <Button onClick={() => save(() => saveGeneral(f))} disabled={pending || f.name.trim().length < 2}>
            Save
          </Button>
        }
      >
        <Field label="Name *" htmlFor="s-name">
          <input id="s-name" className={inputClass} value={f.name} onChange={set("name")} maxLength={80} />
        </Field>
        <Field label="Tagline" htmlFor="s-tagline" hint="One short line, shown under your name.">
          <input id="s-tagline" className={inputClass} value={f.tagline} onChange={set("tagline")} maxLength={80} placeholder="Fresh tacos on wheels" />
        </Field>
        <Field label="Description" htmlFor="s-desc" hint="Use **bold**, *italic*, and start lines with “- ” for a list.">
          <textarea id="s-desc" className={cx(inputClass, "min-h-32")} value={f.description} onChange={set("description")} maxLength={1500} placeholder="Tell guests about your place…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Country *" htmlFor="s-country">
            <select id="s-country" className={inputClass} value={f.country} onChange={set("country")}>
              {COUNTRIES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency *" htmlFor="s-currency">
            <input id="s-currency" className={cx(inputClass, "uppercase")} value={f.currency} onChange={set("currency")} maxLength={3} />
          </Field>
        </div>
        <Field label="Google Maps link" htmlFor="s-maps" hint="Optional. Your Directions button opens your Google listing (reviews, photos, hours) instead of a pin.">
          <input id="s-maps" className={inputClass} value={f.googleMapsUrl} onChange={set("googleMapsUrl")} inputMode="url" placeholder="https://maps.app.goo.gl/…" />
        </Field>
      </Card>
    </>
  );
}

// ── Location ─────────────────────────────────────────

function LocationTab({ data }: { data: SettingsData }) {
  const [f, setF] = useState({ addressLine: v(data.addressLine), city: v(data.city), region: v(data.region), postalCode: v(data.postalCode), addressNote: v(data.addressNote), timeZone: data.timeZone });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const { save, pending } = useSaver();
  const [showHours, setShowHours] = useState(data.openingHours !== null);
  const [hours, setHours] = useState<WeekHours>(data.openingHours ?? defaultHours());
  const full = [f.addressLine, f.city, [f.region, f.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  const setDay = (d: number, patch: Partial<WeekHours[number]>) => setHours((h) => h.map((x, i) => (i === d ? { ...x, ...patch } : x)));
  const badDay = showHours && hours.some((d) => !d.closed && (!d.from || !d.until || d.from === d.until));

  return (
    <>
      <Card
        title="Your address"
        text="Guests see it as a map with Directions and Copy address buttons."
        footer={
          <Button onClick={() => save(() => saveLocation({ ...f, openingHours: showHours ? hours : null }))} disabled={pending || badDay}>
            Save
          </Button>
        }
      >
        <Field label="Street address" htmlFor="l-street">
          <input id="l-street" className={inputClass} value={f.addressLine} onChange={set("addressLine")} autoComplete="street-address" placeholder="100 Main Street" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem_8rem]">
          <Field label="City" htmlFor="l-city">
            <input id="l-city" className={inputClass} value={f.city} onChange={set("city")} autoComplete="address-level2" />
          </Field>
          <Field label="State" htmlFor="l-state">
            <input id="l-state" className={inputClass} value={f.region} onChange={set("region")} autoComplete="address-level1" placeholder="TX" />
          </Field>
          <Field label="ZIP code" htmlFor="l-zip">
            <input id="l-zip" className={inputClass} value={f.postalCode} onChange={set("postalCode")} autoComplete="postal-code" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Getting here" htmlFor="l-note" hint="Optional. Entrance, parking, nearest subway…">
          <input id="l-note" className={inputClass} value={f.addressNote} onChange={set("addressNote")} maxLength={200} placeholder="Entrance on Court Street. Street parking after 6 PM." />
        </Field>
        <Field label="Time zone" htmlFor="l-tz" hint="Your stats count days and hours in this time zone.">
          <select id="l-tz" className={inputClass} value={f.timeZone} onChange={set("timeZone")}>
            {US_TIME_ZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </Field>
        {full && (
          <iframe
            title="Map preview"
            src={`https://www.google.com/maps?q=${encodeURIComponent(full)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-56 w-full rounded-2xl border border-neutral-200"
          />
        )}

        <div className="border-t border-neutral-100 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Opening hours</p>
              <p className="text-sm text-neutral-600">Guests see “Open now” or when you open next.</p>
            </div>
            <Toggle checked={showHours} onChange={setShowHours} label="Show opening hours" />
          </div>
          {showHours && (
            <ul className="mt-4 divide-y divide-neutral-100 rounded-2xl border border-neutral-200" aria-label="Opening hours">
              {WEEK_FROM_MONDAY.map((d) => {
                const day = hours[d];
                return (
                  <li key={d} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                    <span className="w-24 font-medium">{DAY_NAMES[d]}</span>
                    <label className="flex items-center gap-2 text-sm text-neutral-600">
                      <Toggle checked={!day.closed} onChange={(open) => setDay(d, { closed: !open })} label={`Open on ${DAY_NAMES[d]}`} />
                      {day.closed ? "Closed" : "Open"}
                    </label>
                    {!day.closed && (
                      <span className="flex items-center gap-2 sm:ml-auto">
                        <input type="time" aria-label={`${DAY_NAMES[d]} opens`} className={cx(inputClass, "w-32")} value={day.from} onChange={(e) => setDay(d, { from: e.target.value })} />
                        <span className="text-neutral-400">–</span>
                        <input type="time" aria-label={`${DAY_NAMES[d]} closes`} className={cx(inputClass, "w-32")} value={day.until} onChange={(e) => setDay(d, { until: e.target.value })} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {showHours && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                className="font-semibold text-brand"
                onClick={() => {
                  // Chép giờ của ngày mở cửa đầu tiên (tính từ thứ Hai) sang mọi ngày mở cửa
                  const first = WEEK_FROM_MONDAY.map((d) => hours[d]).find((d) => !d.closed);
                  if (first) setHours((h) => h.map((x) => (x.closed ? x : { ...x, from: first.from, until: first.until })));
                }}
              >
                Use the same times every open day
              </button>
              <span className="text-neutral-500">Closing after midnight? Enter it as is, e.g. 6:00 PM – 2:00 AM.</span>
            </div>
          )}
          {badDay && <p className="mt-2 text-sm text-red-600">Each open day needs a start and end time that are different.</p>}
        </div>
      </Card>
    </>
  );
}

// ── Page ─────────────────────────────────────────────

function PageTab({ data }: { data: SettingsData }) {
  const toast = useToast();
  const { save, pending } = useSaver();
  const [live, setLive] = useState(data.isPublished);
  const [slug, setSlug] = useState(data.slug);
  const [editingSlug, setEditingSlug] = useState(false);
  const [seo, setSeo] = useState({ seoTitle: v(data.seoTitle), seoDescription: v(data.seoDescription), inSitemap: data.inSitemap });

  function togglePublished(next: boolean) {
    setLive(next);
    save(() => setPublished(next), next ? "Your page is live" : "Your page is off", (r) => {
      if (!r.ok) setLive(!next); // lưu lỗi thì trả công tắc về như cũ
    });
  }

  return (
    <>
      <Card>
        <div className="flex items-center gap-3">
          <span className={cx("h-2.5 w-2.5 rounded-full", live ? "bg-green-600" : "bg-neutral-400")} />
          <div className="flex-1">
            <p className="font-medium">{live ? "Your page is live" : "Your page is off"}</p>
            <p className="text-sm text-neutral-600">{live ? "Anyone with your link or QR code can see your menu." : "Turn it on when you are ready. Until then the link shows “not open yet”."}</p>
          </div>
          <Toggle checked={live} onChange={togglePublished} label="Page is live" disabled={pending} />
        </div>
        <div className="border-t border-neutral-100 pt-5">
          <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">Your URL</p>
          {editingSlug ? (
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                save(() => changeSlug(slug), "Address changed", (r) => {
                  if (r.ok) {
                    if (r.slug) setSlug(r.slug);
                    setEditingSlug(false);
                  }
                });
              }}
            >
              <span className="font-mono text-sm text-neutral-500">{data.publicHost}/@</span>
              <input aria-label="Page address" className={cx(inputClass, "w-auto flex-1 font-mono")} value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={48} autoFocus />
              <Button type="submit" disabled={pending}>
                Save
              </Button>
              <Button variant="secondary" onClick={() => (setSlug(data.slug), setEditingSlug(false))}>
                Cancel
              </Button>
              <p className="w-full text-xs text-amber-700">Changing it breaks QR codes you already printed.</p>
            </form>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="w-full font-mono text-sm break-all sm:w-auto sm:flex-1">
                {data.publicHost}/@{slug}
              </p>
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(`${location.origin}/@${slug}`).then(() => toast("Link copied"))}>
                Copy
              </Button>
              <Button variant="secondary" onClick={() => setEditingSlug(true)}>
                Change
              </Button>
            </div>
          )}
        </div>
      </Card>

      <QrCard slug={slug} publicUrl={`${data.publicHost}/@${slug}`} />

      <Card
        title="Search engines"
        text="How your page appears in Google. Recommended when your page is live."
        footer={
          <Button onClick={() => save(() => saveSeo(seo))} disabled={pending || seo.seoTitle.length > 60 || seo.seoDescription.length > 160}>
            Save
          </Button>
        }
      >
        <Field label="SEO title" htmlFor="p-seo-title" hint="Defaults to your name if blank.">
          <div className="relative">
            <input id="p-seo-title" className={cx(inputClass, "pr-16")} value={seo.seoTitle} onChange={(e) => setSeo((s) => ({ ...s, seoTitle: e.target.value }))} placeholder={`${data.name} — Best Burgers in Brooklyn`} />
            <span className="absolute top-1/2 right-3 -translate-y-1/2">
              <Counter value={seo.seoTitle} max={60} />
            </span>
          </div>
        </Field>
        <Field label="Meta description" htmlFor="p-seo-desc" hint="Short description under your title in search results.">
          <textarea id="p-seo-desc" className={cx(inputClass, "min-h-20")} value={seo.seoDescription} onChange={(e) => setSeo((s) => ({ ...s, seoDescription: e.target.value }))} placeholder="Discover our menu, hours, and location." />
          <div className="text-right">
            <Counter value={seo.seoDescription} max={160} />
          </div>
        </Field>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4">
          <span>
            <span className="font-medium">Include in sitemap</span>
            <span className="block text-sm text-neutral-600">Helps Google find your page. Keep on when your page is live.</span>
          </span>
          <Toggle checked={seo.inSitemap} onChange={(x) => setSeo((s) => ({ ...s, inSitemap: x }))} label="Include in sitemap" />
        </label>
      </Card>
    </>
  );
}

// ── Design ───────────────────────────────────────────

function DesignTab({ data }: { data: SettingsData }) {
  const { save, pending } = useSaver();
  const [style, setStyle] = useState<MenuStyleKey>(data.menuStyle);
  const [color, setColor] = useState(data.accentColor);

  function pickStyle(next: MenuStyleKey) {
    if (next === style) return;
    const before = style;
    setStyle(next);
    save(() => saveMenuStyle(next), `${MENU_STYLE_INFO[next].name} style is on your page`, (r) => {
      if (!r.ok) setStyle(before);
    });
  }

  return (
    <>
      <Card title="Menu style" text="How your menu looks to guests. Your dishes, prices and settings stay the same when you switch.">
        <div role="radiogroup" aria-label="Menu style" className="grid gap-4 sm:grid-cols-2">
          {MENU_STYLES.map((key) => {
            const info = MENU_STYLE_INFO[key];
            const active = key === style;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => pickStyle(key)}
                className={cx(
                  "rounded-2xl border-2 p-3 text-left transition",
                  active ? "border-brand bg-brand/5" : "border-neutral-200 hover:border-neutral-300",
                )}
              >
                <StyleThumb styleKey={key} accent={isHexColor(color) ? color : "#1f4fae"} />
                <span className="mt-3 flex items-center gap-2">
                  <span className="font-semibold">{info.name}</span>
                  {active && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">In use</span>}
                </span>
                <span className="mt-0.5 block text-sm text-neutral-600">{info.text}</span>
                <span className="mt-1 block text-xs text-neutral-500">Good for: {info.bestFor}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-neutral-500">
          More styles are on the way.{" "}
          <Link href="/preview" className="font-semibold text-brand">
            Preview your page
          </Link>
        </p>
      </Card>

      <Card
        title="Accent colour"
        text="Buttons, links and highlights on your page. Pick one, or use your own."
        footer={
          <Button onClick={() => save(() => saveAccentColor(color), "Colour saved")} disabled={pending || !isHexColor(color) || color === data.accentColor}>
            Save colour
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              aria-pressed={color.toLowerCase() === c}
              onClick={() => setColor(c)}
              className={cx("h-11 w-11 rounded-full ring-offset-2 transition", color.toLowerCase() === c && "ring-2 ring-neutral-900")}
              style={{ background: c }}
            />
          ))}
        </div>
        <Field label="Custom colour" htmlFor="p-color">
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Pick a custom colour" value={isHexColor(color) ? color : "#000000"} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" />
            <input id="p-color" className={cx(inputClass, "w-36 font-mono")} value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} />
            <span className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: isHexColor(color) ? color : "#999" }}>
              Preview
            </span>
          </div>
        </Field>
      </Card>

    </>
  );
}

/** Hình thu nhỏ của từng kiểu, vẽ bằng khối màu (không cần ảnh). */
function StyleThumb({ styleKey, accent }: { styleKey: MenuStyleKey; accent: string }) {
  const rows = [0, 1, 2];
  if (styleKey === "CLASSIC") {
    return (
      <span aria-hidden className="block h-36 overflow-hidden rounded-xl border border-[#e7dfd2] bg-[#fbf8f2] px-5 pt-4 text-center font-serif text-[#2b2620]">
        <span className="block text-[11px] font-semibold tracking-[0.2em] uppercase">Your Restaurant</span>
        <span className="mx-auto mt-1 block h-0.5 w-6" style={{ background: accent }} />
        <span className="mt-2 block text-[9px] tracking-[0.2em] uppercase opacity-70">Mains</span>
        {rows.map((i) => (
          <span key={i} className="mt-1.5 flex items-baseline gap-1 text-[9px]">
            <span className="h-1.5 rounded-sm bg-[#2b2620]/70" style={{ width: `${30 + i * 8}%` }} />
            <span className="flex-1 border-b border-dotted border-[#2b2620]/40" />
            <span className="h-1.5 w-5 rounded-sm bg-[#2b2620]/70" />
          </span>
        ))}
      </span>
    );
  }
  return (
    <span aria-hidden className="block h-36 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <span className="block h-8" style={{ background: accent }} />
      <span className="-mt-4 ml-3 block h-8 w-8 rounded-lg border-2 border-white bg-white shadow-sm" />
      <span className="mt-1 ml-3 block h-2 w-24 rounded-sm bg-neutral-800" />
      <span className="mt-2 ml-3 flex gap-1">
        <span className="h-3 w-12 rounded-full" style={{ background: accent }} />
        <span className="h-3 w-12 rounded-full border border-neutral-300" />
      </span>
      {rows.slice(0, 2).map((i) => (
        <span key={i} className="mx-3 mt-2 flex items-center gap-2">
          <span className="h-1.5 flex-1 rounded-sm bg-neutral-300" />
          <span className="h-1.5 w-5 rounded-sm bg-neutral-700" />
        </span>
      ))}
    </span>
  );
}

// ── Buttons ──────────────────────────────────────────

function ButtonsTab({ data }: { data: SettingsData }) {
  const { save, pending } = useSaver();
  const [f, setF] = useState({
    customLinkLabel: v(data.customLinkLabel),
    customLinkUrl: v(data.customLinkUrl),
    phone: v(data.phone),
    whatsapp: v(data.whatsapp),
    contactEmail: v(data.contactEmail),
    showDirections: data.showDirections,
    primaryButton: data.primaryButton as ContactChoice,
    secondaryButton: data.secondaryButton as ContactChoice,
  });
  // Công tắc bật/tắt từng nút; tắt thì xóa giá trị khi lưu.
  const [on, setOn] = useState({
    CUSTOM_LINK: Boolean(data.customLinkUrl),
    PHONE: Boolean(data.phone),
    WHATSAPP: Boolean(data.whatsapp),
    EMAIL: Boolean(data.contactEmail),
    DIRECTIONS: data.showDirections,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  function submit() {
    save(() =>
      saveButtons({
        customLinkLabel: on.CUSTOM_LINK ? f.customLinkLabel : "",
        customLinkUrl: on.CUSTOM_LINK ? f.customLinkUrl : "",
        phone: on.PHONE ? f.phone : "",
        whatsapp: on.WHATSAPP ? f.whatsapp : "",
        contactEmail: on.EMAIL ? f.contactEmail : "",
        showDirections: on.DIRECTIONS,
        primaryButton: f.primaryButton,
        secondaryButton: f.secondaryButton,
      }),
    );
  }

  const row = (kind: keyof typeof on, title: string, text: string, fields?: ReactNode) => (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-neutral-600">{text}</p>
        </div>
        <Toggle checked={on[kind]} onChange={(x) => setOn((s) => ({ ...s, [kind]: x }))} label={title} />
      </div>
      {on[kind] && fields && <div className="mt-4 space-y-3">{fields}</div>}
    </div>
  );

  const picker = (which: "primaryButton" | "secondaryButton", label: string) => (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {(["NONE", ...CONTACT_ORDER] as ContactChoice[]).map((c) => {
          const disabled = c !== "NONE" && !on[c];
          const active = f[which] === c;
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              onClick={() => setF((s) => ({ ...s, [which]: c }))}
              className={cx(
                "rounded-full border px-4 py-1.5 text-sm font-medium",
                active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {c === "NONE" ? "None" : c === "CUSTOM_LINK" ? "Custom link" : CONTACT_LABEL[c]}
            </button>
          );
        })}
      </div>
    </Field>
  );

  return (
    <>
      <p className="text-neutral-600">Turn on every way guests can reach you. They all show on your page with your address. Then pick the 2 that go at the top.</p>
      <Card>
        {row(
          "CUSTOM_LINK",
          "Custom link",
          "Ordering, reservations, or any website.",
          <>
            <input aria-label="Button text" className={inputClass} value={f.customLinkLabel} onChange={set("customLinkLabel")} placeholder="Order online" maxLength={30} />
            <input aria-label="Link" className={inputClass} value={f.customLinkUrl} onChange={set("customLinkUrl")} placeholder="https://…" inputMode="url" />
          </>,
        )}
        {row("PHONE", "Phone", "Shows as “Call”. Include the country code.", <input aria-label="Phone number" className={inputClass} value={f.phone} onChange={set("phone")} placeholder="+1 555 010 0100" inputMode="tel" />)}
        {row("WHATSAPP", "WhatsApp", "Can be a different number than Call.", <input aria-label="WhatsApp number" className={inputClass} value={f.whatsapp} onChange={set("whatsapp")} placeholder="+1 555 010 0101" inputMode="tel" />)}
        {row("EMAIL", "Email", "Opens the guest’s email app.", <input aria-label="Email address" className={inputClass} value={f.contactEmail} onChange={set("contactEmail")} placeholder="hello@yourrestaurant.com" inputMode="email" />)}
        {row("DIRECTIONS", "Directions", "Opens your Google Maps link from General, or your address from Location.")}
      </Card>

      <Card
        title="Header buttons"
        text="The two buttons under your name. The first uses your accent colour. Leave one on None and the first button you turned on is used."
        footer={
          <Button onClick={submit} disabled={pending}>
            Save buttons
          </Button>
        }
      >
        {picker("primaryButton", "Primary")}
        {picker("secondaryButton", "Secondary")}
      </Card>
    </>
  );
}
