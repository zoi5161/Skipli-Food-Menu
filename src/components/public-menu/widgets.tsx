"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { DAY_NAMES, WEEK_FROM_MONDAY, formatDayHours, openStatus, type WeekHours } from "@/lib/menu/hours";

// Mấy mảnh nhỏ của trang khách cần chạy trên điện thoại của khách:
// trạng thái "Đang mở / Đã đóng" (theo giờ trên máy khách), nút Chia sẻ, nút Chép địa chỉ.

/** Giờ hiện tại, cập nhật mỗi phút. Ở máy chủ trả null (trang lưu đệm không biết giờ của khách). */
function useNow(): Date | null {
  const minute = useSyncExternalStore(
    (onChange) => {
      const t = setInterval(onChange, 30_000);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
  return minute === null ? null : new Date(minute * 60_000);
}

export function OpenStatusLine({ hours, className = "" }: { hours: WeekHours; className?: string }) {
  const now = useNow();
  if (!now) return <p className={`h-5 ${className}`} aria-hidden />;
  const s = openStatus(hours, now.getDay(), now.getHours() * 60 + now.getMinutes());
  return (
    <p className={`flex items-center gap-2 text-sm ${className}`} data-testid="open-status">
      <span className={`h-2 w-2 shrink-0 rounded-full ${s.open ? "bg-emerald-500" : "bg-neutral-400"}`} aria-hidden />
      <span className="font-semibold">{s.headline}</span>
      {s.detail && <span className="opacity-70">· {s.detail}</span>}
    </p>
  );
}

/** Bảng giờ 7 ngày, tô đậm hôm nay. */
export function HoursTable({ hours, lineColor }: { hours: WeekHours; lineColor: string }) {
  const now = useNow();
  const today = now?.getDay();
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Opening hours</caption>
      <tbody>
        {WEEK_FROM_MONDAY.map((d) => (
          <tr key={d} className={d === today ? "font-semibold" : "opacity-80"} style={{ borderTop: `1px solid ${lineColor}` }}>
            <th scope="row" className={`py-2.5 text-left ${d === today ? "font-semibold" : "font-normal"}`}>
              {DAY_NAMES[d]}
              {d === today && <span className="sr-only"> (today)</span>}
            </th>
            <td className="py-2.5 text-right tabular-nums">{formatDayHours(hours[d])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Giờ hôm nay, một dòng. */
export function TodayHours({ hours }: { hours: WeekHours }) {
  const now = useNow();
  if (!now) return null;
  return <p className="text-sm opacity-70">Today {formatDayHours(hours[now.getDay()])}</p>;
}

function useFlash(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  return [
    on,
    () => {
      setOn(true);
      setTimeout(() => setOn(false), 1800);
    },
  ];
}

/** Nút Chia sẻ: trên điện thoại mở bảng chia sẻ của máy, trên máy tính chép link. */
export function ShareButton({ url, title, className = "" }: { url: string; title: string; className?: string }) {
  const [copied, flash] = useFlash();
  async function share() {
    const full = new URL(url, location.href).toString();
    if (navigator.share) {
      await navigator.share({ title, url: full }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(full);
    flash();
  }
  return (
    <button type="button" onClick={share} className={className} aria-label={copied ? "Link copied" : "Share this menu"} title="Share">
      {copied ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 12l5 5L20 7" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6" />
        </svg>
      )}
    </button>
  );
}

export function CopyButton({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  const [copied, flash] = useFlash();
  return (
    <button type="button" className={className} onClick={() => navigator.clipboard?.writeText(text).then(flash)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15V5a2 2 0 012-2h10" />
      </svg>
      {copied ? "Copied" : children}
    </button>
  );
}
