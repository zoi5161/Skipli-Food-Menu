import Link from "next/link";
import { directionsHref, formatAddress, type ContactKind, type ContactLink } from "@/lib/menu/contact";
import type { PublicMenu } from "@/lib/menu/public";
import { RichText } from "@/lib/menu/rich-text";
import { ContactIcon } from "./contact-button";
import type { StyleKit } from "./styles/types";
import { CopyButton, HoursTable, OpenStatusLine, TodayHours } from "./widgets";

// Các mục bên dưới menu và cột bên phải, dùng chung cho mọi kiểu (đổi màu theo theme).

type R = PublicMenu["restaurant"];

function DirectionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M21 3L3 10.5l7.5 3 3 7.5L21 3z" />
    </svg>
  );
}

/** Ô bên phải (màn hình rộng): đang mở/đóng, giờ hôm nay, địa chỉ + nút Đi. */
export function InfoCard({ r, kit }: { r: R; kit: StyleKit }) {
  const t = kit.theme;
  const address = formatAddress(r);
  const go = directionsHref(r);
  if (!r.openingHours && !address) return null;
  return (
    <div className={`overflow-hidden ${t.panel}`}>
      {r.openingHours && (
        <div className="px-6 pt-5 pb-4">
          <OpenStatusLine hours={r.openingHours} className="text-base" />
          <div className="pl-4">
            <TodayHours hours={r.openingHours} />
          </div>
        </div>
      )}
      {address && (
        <div className="flex items-center gap-3 px-6 pb-5" style={r.openingHours ? undefined : { paddingTop: 20 }}>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{r.addressLine || r.city}</p>
            <p className={`text-sm ${t.muted}`}>{[r.city, [r.region, r.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
          </div>
          {go && (
            <a href={go} target="_blank" rel="noopener noreferrer" className={`flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm font-semibold ${t.softButton}`}>
              <DirectionsIcon /> Go
            </a>
          )}
        </div>
      )}
      <a href="#location" className="flex items-center justify-between border-t px-6 py-4 font-semibold hover:opacity-80" style={{ borderColor: t.line }}>
        All hours and map
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </a>
    </div>
  );
}

/** Địa chỉ, bản đồ, giờ mở cửa. */
export function LocationSection({ r, kit }: { r: R; kit: StyleKit }) {
  const t = kit.theme;
  const address = formatAddress(r);
  const go = directionsHref(r);
  if (!address && !r.openingHours) return null;
  return (
    <section id="location" className="scroll-mt-28 pt-14" aria-labelledby="location-title">
      <h2 id="location-title" className={t.sectionTitle}>
        {address && r.openingHours ? "Location and hours" : address ? "Location" : "Hours"}
      </h2>
      <div className={`mt-4 overflow-hidden font-sans ${t.panel}`}>
        {address && (
          <>
            <iframe
              title={`Map of ${r.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-64 w-full border-0 sm:h-72"
            />
            <div className="p-5 sm:p-6">
              <p className="text-lg font-semibold">{r.addressLine || r.city}</p>
              <p className={t.muted}>{[r.city, [r.region, r.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
              {r.addressNote && <p className={`mt-3 ${t.muted}`}>{r.addressNote}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {go && (
                  <a
                    href={go}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex h-12 items-center justify-center gap-2 font-semibold ${kit.buttonShape === "pill" ? "rounded-full" : "rounded-md"}`}
                    style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                  >
                    <DirectionsIcon /> Directions
                  </a>
                )}
                <CopyButton text={address} className={`flex h-12 items-center justify-center gap-2 font-semibold ${t.softButton} ${go ? "" : "col-span-2"}`}>
                  Copy address
                </CopyButton>
              </div>
            </div>
          </>
        )}
        {r.openingHours && (
          <div className="px-5 pt-1 pb-3 sm:px-6" style={address ? { borderTop: `1px solid ${t.line}` } : undefined}>
            <HoursTable hours={r.openingHours} lineColor={address ? "transparent" : t.line} />
          </div>
        )}
      </div>
    </section>
  );
}

/** Giới thiệu quán và ảnh. */
export function AboutSection({ r, kit }: { r: R; kit: StyleKit }) {
  const t = kit.theme;
  const showText = Boolean(r.description) && !kit.descriptionInHeader;
  if (!showText && r.galleryUrls.length === 0) return null;
  return (
    <section className="pt-14" aria-labelledby="about-title">
      <h2 id="about-title" className={t.sectionTitle}>
        About
      </h2>
      {showText && <RichText text={r.description!} className={`mt-3 max-w-3xl space-y-3 font-sans text-[17px] leading-relaxed ${t.muted}`} />}
      {r.galleryUrls.length > 0 && (
        <ul className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0" aria-label="Photos">
          {r.galleryUrls.map((url, i) => (
            <li key={url} className="w-64 shrink-0 snap-start sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên */}
              <img src={url} alt={`${r.name} photo ${i + 1}`} loading="lazy" className={`aspect-[4/3] w-full object-cover ${kit.buttonShape === "pill" ? "rounded-2xl" : "rounded-md"}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function contactDetail(kind: ContactKind, r: R): string | null {
  switch (kind) {
    case "PHONE":
      return r.phone;
    case "WHATSAPP":
      return r.whatsapp;
    case "EMAIL":
      return r.contactEmail;
    case "CUSTOM_LINK":
      try {
        return r.customLinkUrl ? new URL(r.customLinkUrl).hostname.replace(/^www\./, "") : null;
      } catch {
        return null;
      }
    case "DIRECTIONS":
      return formatAddress(r) || null;
  }
}

/** Danh sách cách liên hệ, mỗi dòng có biểu tượng + chi tiết. */
export function ContactSection({ r, kit, contacts }: { r: R; kit: StyleKit; contacts: ContactLink[] }) {
  const t = kit.theme;
  if (contacts.length === 0) return null;
  return (
    <section className="pt-14" aria-labelledby="contact-title">
      <h2 id="contact-title" className={t.sectionTitle}>
        Contact
      </h2>
      <ul className="mt-3 font-sans">
        {contacts.map((c) => (
          <li key={c.kind} className="border-b last:border-0" style={{ borderColor: t.line }}>
            <a href={c.href} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex items-center gap-4 py-3.5 hover:opacity-80">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center ${t.softButton}`}>
                <ContactIcon kind={c.kind} />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{c.label}</span>
                {contactDetail(c.kind, r) && <span className={`block truncate text-sm ${t.muted}`}>{contactDetail(c.kind, r)}</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MenuFooter({ r, kit }: { r: R; kit: StyleKit }) {
  const t = kit.theme;
  return (
    <footer className="mx-auto mt-16 max-w-7xl px-4 pb-10 font-sans sm:px-6">
      <div className="flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: t.line }}>
        <div>
          <p className="flex items-center gap-3 font-semibold">
            {r.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh do chủ quán tải lên
              <img src={r.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
            )}
            {r.name}
          </p>
          <p className={`mt-2 text-xs ${t.muted}`}>Menu, prices and hours are set by {r.name} and may change.</p>
        </div>
        {r.plan === "FREE" && (
          <p className={`text-sm ${t.muted}`}>
            <Link href="/" className="inline-flex items-center gap-1.5 hover:underline">
              Made with
              {/* eslint-disable-next-line @next/next/no-img-element -- logo nhỏ */}
              <img src="/assets/skipli-logo-512.png" alt="" width={16} height={16} className="rounded-sm" />
              <span className="font-semibold">Skipli Menu</span>
            </Link>
          </p>
        )}
      </div>
    </footer>
  );
}
