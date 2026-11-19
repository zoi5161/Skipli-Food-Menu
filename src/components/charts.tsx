"use client";

import { useState } from "react";

// Biểu đồ cột một màu (một loại số liệu), không cần thư viện.
// - Cột mảnh (tối đa 24px), bo 4px ở đầu, mọc từ một đường đáy; lưới mảnh, nhạt.
// - Rê chuột / chạm / dùng phím Tab để xem số từng cột.
// - Có bảng số liệu bên dưới (bấm "View as table") cho người đọc bằng phần mềm hỗ trợ.

export type ColumnPoint = {
  key: string;
  /** Nhãn dưới trục (để trống thì không hiện, giúp trục thoáng). */
  axisLabel?: string;
  /** Tiêu đề ô thông tin khi rê chuột, ví dụ "Thu, Nov 19". */
  title: string;
  value: number;
  /** Dòng phụ trong ô thông tin, ví dụ "38 visitors". */
  detail?: string;
  highlight?: boolean;
};

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * pow >= v) return step * pow;
  return 10 * pow;
}

const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : n.toLocaleString("en-US"));

export function ColumnChart({
  points,
  label,
  unit,
  height = 200,
  tableHeaders,
}: {
  points: ColumnPoint[];
  /** Mô tả ngắn cho trình đọc màn hình, ví dụ "Views per day, last 30 days". */
  label: string;
  /** Đơn vị trong ô thông tin, ví dụ "views". */
  unit: string;
  height?: number;
  tableHeaders: [string, string];
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [0, max / 2, max];
  const a = active === null ? null : points[active];

  return (
    <figure className="relative">
      <div className="flex">
        {/* Trục dọc: 3 mốc tròn số */}
        <div className="relative mr-2 w-8 shrink-0 text-right text-[11px] text-neutral-400 tabular-nums" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {fmt(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Lưới */}
          <div className="absolute inset-x-0 top-0" style={{ height }} aria-hidden>
            {ticks.map((t) => (
              <div key={t} className={`absolute inset-x-0 h-px ${t === 0 ? "bg-neutral-300" : "bg-neutral-100"}`} style={{ top: `${100 - (t / max) * 100}%` }} />
            ))}
          </div>

          {/* Cột */}
          <div role="img" aria-label={label} className="relative flex items-end gap-0.5" style={{ height }} onMouseLeave={() => setActive(null)}>
            {points.map((p, i) => (
              <div
                key={p.key}
                tabIndex={0}
                aria-label={`${p.title}: ${p.value} ${unit}${p.detail ? `, ${p.detail}` : ""}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(i)}
                className="group flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
              >
                <div
                  className={`w-full max-w-6 rounded-t transition-colors ${active === i ? "bg-brand-dark" : p.highlight ? "bg-brand" : "bg-brand/80"} group-focus-visible:ring-2 group-focus-visible:ring-brand/40`}
                  style={{ height: p.value === 0 ? 0 : `max(3px, ${(p.value / max) * 100}%)` }}
                />
              </div>
            ))}
          </div>

          {/* Ô thông tin khi rê chuột */}
          {a && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-neutral-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
              style={{
                left: `clamp(60px, ${((active! + 0.5) / points.length) * 100}%, calc(100% - 60px))`,
                bottom: `${height - Math.min(height, (a.value / max) * height) + 8}px`,
              }}
              role="status"
            >
              <p className="font-semibold">{a.title}</p>
              <p className="tabular-nums">
                {a.value.toLocaleString("en-US")} {unit}
              </p>
              {a.detail && <p className="text-neutral-300">{a.detail}</p>}
            </div>
          )}

          {/* Nhãn trục ngang */}
          <div className="mt-1.5 flex gap-0.5 text-[11px] text-neutral-500" aria-hidden>
            {points.map((p) => (
              <span key={p.key} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
                {p.axisLabel ?? ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800">View as table</summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">{tableHeaders[0]}</th>
                <th className="px-3 py-2 text-right font-medium">{tableHeaders[1]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {points.map((p) => (
                <tr key={p.key}>
                  <td className="px-3 py-1.5">{p.title}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {p.value.toLocaleString("en-US")}
                    {p.detail && <span className="ml-2 text-neutral-400">({p.detail})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
