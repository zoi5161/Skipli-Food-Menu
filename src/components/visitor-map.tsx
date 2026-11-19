"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoAlbersUsa, geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry, MultiLineString } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { ISO2_TO_NUMERIC, NUMERIC_TO_ISO2 } from "@/lib/analytics/country-codes";

// Bản đồ vị trí khách: mỗi thành phố một chấm tròn (to theo số lượt xem).
// - "Nearby" (mặc định): tự phóng to vào vùng có nhiều khách nhất, ghi tên các thành phố lớn,
//   để các thành phố gần nhau (Springfield, Decatur…) không đè lên nhau, nhất là trên điện thoại.
// - "United States": ranh giới các bang (khách chủ yếu ở Mỹ).
// - "World": tô màu nước theo số lượt xem (đậm = nhiều), kèm chấm thành phố.
// Dữ liệu bản đồ (world-atlas, us-atlas) chỉ tải khi mở trang này.

export type MapPoint = { city: string | null; region: string | null; country: string | null; lat: number; lng: number; views: number };
type View = "local" | "us" | "world";
type Shapes = { regions: Feature<Geometry, { name: string }>[]; borders: MultiLineString | null; outline: FeatureCollection };

const SIZE: Record<View, [number, number]> = { local: [900, 560], us: [975, 610], world: [960, 500] };
const VIEW_LABEL: Record<View, string> = { local: "Nearby", us: "United States", world: "World" };
// Thang màu một màu (nhạt → vừa) cho số lượt xem theo nước. Cố ý không quá đậm
// để các chấm thành phố (màu chính đậm, viền trắng) vẫn nổi rõ trên nền nước có nhiều khách.
const STEPS = ["#e4eaf6", "#cbd8f0", "#adc2e7", "#8fabdc", "#7395d0"];
const NO_DATA = "#eef0f3";
const LAND = "#e9ecf1";

const placeName = (p: { city: string | null; region: string | null; country: string | null }) => [p.city, p.region, p.country].filter(Boolean).join(", ") || "Unknown";
const countryName = (iso2: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(iso2) ?? iso2;
  } catch {
    return iso2;
  }
};

async function loadShapes(view: View): Promise<Shapes> {
  if (view === "us" || view === "local") {
    const topo = (await import("us-atlas/states-10m.json")).default as unknown as Topology<{ states: GeometryCollection<{ name: string }>; nation: GeometryCollection }>;
    const states = feature(topo, topo.objects.states) as FeatureCollection<Geometry, { name: string }>;
    return { regions: states.features, borders: mesh(topo, topo.objects.states, (a, b) => a !== b), outline: feature(topo, topo.objects.nation) as FeatureCollection };
  }
  const topo = (await import("world-atlas/countries-110m.json")).default as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const countries = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
  const regions = countries.features.filter((f) => f.id !== "010"); // bỏ Nam Cực cho gọn
  return { regions, borders: null, outline: { type: "FeatureCollection", features: regions } };
}

export function VisitorMap({ points, countries }: { points: MapPoint[]; countries: { country: string; views: number }[] }) {
  const totalKnown = countries.reduce((s, c) => s + c.views, 0);
  const usShare = totalKnown === 0 ? 1 : (countries.find((c) => c.country === "US")?.views ?? 0) / totalKnown;
  const [view, setView] = useState<View>(usShare >= 0.5 ? "local" : "world");
  const [shapes, setShapes] = useState<Partial<Record<View, Shapes>>>({});
  const [active, setActive] = useState<{ x: number; y: number; title: string; detail: string } | null>(null);
  // Bề rộng thật của bản đồ trên màn hình, để tên thành phố luôn cỡ chữ 12px và không đè nhau
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const key = view === "local" ? "us" : view;
    if (shapes[key]) return;
    let alive = true;
    loadShapes(key).then((s) => alive && setShapes((all) => ({ ...all, [key]: s })));
    return () => {
      alive = false;
    };
  }, [view, shapes]);

  const current = shapes[view === "local" ? "us" : view];
  const [W, H] = SIZE[view];
  const total = points.reduce((s, p) => s + p.views, 0);
  const max = Math.max(1, ...points.map((p) => p.views));

  // Vùng "Nearby": các thành phố ở Mỹ chiếm khoảng 85% lượt xem (tối thiểu ~2 độ mỗi chiều)
  const localArea = useMemo(() => {
    const us = points.filter((p) => p.country === "US").sort((a, b) => b.views - a.views);
    const sum = us.reduce((s, p) => s + p.views, 0);
    const chosen: MapPoint[] = [];
    let acc = 0;
    for (const p of us) {
      chosen.push(p);
      acc += p.views;
      if (acc >= sum * 0.85 && chosen.length >= 2) break;
    }
    if (chosen.length === 0) return null;
    const lats = chosen.map((p) => p.lat);
    const lngs = chosen.map((p) => p.lng);
    const pad = (lo: number, hi: number) => Math.max(1, (hi - lo) * 0.35);
    const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const dLat = pad(la0, la1);
    const dLng = pad(lo0, lo1) * 1.4;
    return { type: "MultiPoint" as const, coordinates: [[lo0 - dLng, la0 - dLat], [lo1 + dLng, la1 + dLat]] };
  }, [points]);

  const projection: GeoProjection | null = useMemo(() => {
    if (!current) return null;
    if (view === "local" && localArea) return geoMercator().fitSize([W, H], localArea);
    return (view === "world" ? geoNaturalEarth1() : geoAlbersUsa()).fitSize([W, H], current.outline);
  }, [current, view, W, H, localArea]);
  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // Chấm: to theo căn bậc hai của lượt xem (diện tích tỉ lệ với số), chấm nhỏ vẽ sau để nằm trên
  const dots = useMemo(() => {
    if (!projection) return { shown: [], outside: 0 };
    const shown: (MapPoint & { x: number; y: number; r: number })[] = [];
    let outside = 0;
    for (const p of [...points].sort((a, b) => b.views - a.views)) {
      // Chế độ US chỉ chấm khách ở Mỹ (Toronto, Tijuana… nằm sát biên giới vẫn tính là ngoài Mỹ)
      const xy = view !== "world" && p.country !== "US" ? null : projection([p.lng, p.lat]);
      if (!xy || (view === "local" && (xy[0] < -20 || xy[1] < -20 || xy[0] > W + 20 || xy[1] > H + 20))) {
        outside += p.views;
        continue;
      }
      const [base, extra] = view === "local" ? [6, 30] : view === "us" ? [4, 18] : [3, 14];
      shown.push({ ...p, x: xy[0], y: xy[1], r: base + extra * Math.sqrt(p.views / max) });
    }
    return { shown, outside };
  }, [projection, points, max, view, W, H]);

  // Tên thành phố (chế độ Nearby): thử đặt bên phải, trái, dưới, trên; bỏ qua nếu chỗ nào cũng đè.
  const labels = useMemo(() => {
    if (view !== "local" || !boxW) return [];
    const k = boxW / W;
    const circles = dots.shown.map((d) => ({ x: d.x * k, y: d.y * k, r: d.r * k }));
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const out: { key: string; text: string; left: number; top: number }[] = [];
    const hitsCircle = (b: { x: number; y: number; w: number; h: number }) =>
      circles.some((c) => {
        const nx = Math.max(b.x, Math.min(c.x, b.x + b.w));
        const ny = Math.max(b.y, Math.min(c.y, b.y + b.h));
        return (nx - c.x) ** 2 + (ny - c.y) ** 2 < (c.r + 1) ** 2;
      });
    const hitsLabel = (b: { x: number; y: number; w: number; h: number }) =>
      placed.some((p) => b.x < p.x + p.w + 2 && b.x + b.w + 2 > p.x && b.y < p.y + p.h && b.y + b.h > p.y);
    for (const d of dots.shown.slice(0, 6)) {
      if (!d.city) continue;
      const cx = d.x * k;
      const cy = d.y * k;
      const r = d.r * k;
      const w = d.city.length * 7 + 4;
      const h = 16;
      const tries = [
        { x: cx + r + 4, y: cy - h / 2 },
        { x: cx - r - 4 - w, y: cy - h / 2 },
        { x: cx - w / 2, y: cy + r + 2 },
        { x: cx - w / 2, y: cy - r - h - 2 },
      ];
      const spot = tries.find((t) => t.x >= 0 && t.y >= 0 && t.x + w <= boxW && t.y + h <= H * k && !hitsCircle({ ...t, w, h }) && !hitsLabel({ ...t, w, h }));
      if (!spot) continue;
      placed.push({ ...spot, w, h });
      out.push({ key: placeName(d), text: d.city, left: spot.x, top: spot.y });
    }
    return out;
  }, [view, boxW, W, H, dots]);

  const byCountry = useMemo(() => new Map(countries.map((c) => [ISO2_TO_NUMERIC[c.country], c.views])), [countries]);
  const maxCountry = Math.max(1, ...countries.map((c) => c.views));
  const fillFor = (id: string | number | undefined) => {
    const v = id === undefined ? undefined : byCountry.get(String(id));
    if (!v) return NO_DATA;
    // Thang log để nước ít khách vẫn thấy màu
    const t = Math.log(1 + v) / Math.log(1 + maxCountry);
    return STEPS[Math.min(STEPS.length - 1, Math.floor(t * STEPS.length))];
  };

  const show = (x: number, y: number, title: string, views: number) =>
    setActive({ x, y, title, detail: `${views.toLocaleString("en-US")} ${views === 1 ? "view" : "views"} · ${total ? Math.round((views / total) * 100) : 0}%` });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Map area" className="flex gap-1 rounded-full bg-neutral-100 p-1">
          {(["local", "us", "world"] as View[]).filter((v) => v !== "local" || localArea).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => (setView(v), setActive(null))}
              className={`rounded-full px-3.5 py-1 text-sm font-semibold ${view === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand/75 ring-2 ring-white" aria-hidden />
          Bigger circle = more menu views. Tap a circle for numbers.
        </p>
      </div>

      <div ref={box} className="relative mt-3" onMouseLeave={() => setActive(null)}>
        {!current || !path ? (
          <div className="w-full animate-pulse rounded-2xl bg-neutral-100" style={{ aspectRatio: `${W} / ${H}` }} aria-label="Loading map" />
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full overflow-hidden rounded-2xl"
            role="img"
            aria-label={`Map of where guests opened your menu (${VIEW_LABEL[view]})`}
          >
            <g>
              {current.regions.map((f, i) => {
                const iso2 = view === "world" ? NUMERIC_TO_ISO2[String(f.id)] : undefined;
                const v = view === "world" ? byCountry.get(String(f.id)) : undefined;
                return (
                  <path
                    key={`${f.id ?? i}`}
                    d={path(f) ?? undefined}
                    fill={view === "world" ? fillFor(f.id) : LAND}
                    stroke="#ffffff"
                    strokeWidth={view === "world" ? 0.6 : 0}
                    onMouseEnter={v ? () => show(...(path.centroid(f) as [number, number]), iso2 ? countryName(iso2) : f.properties.name, v) : undefined}
                    data-country={iso2}
                  />
                );
              })}
              {current.borders && <path d={path(current.borders) ?? undefined} fill="none" stroke="#ffffff" strokeWidth={view === "local" ? 2 : 1} strokeLinejoin="round" />}
            </g>
            <g>
              {dots.shown.map((d) => (
                <circle
                  key={placeName(d)}
                  cx={d.x}
                  cy={d.y}
                  r={d.r}
                  className="cursor-pointer fill-brand/80 stroke-white outline-none hover:fill-brand-dark focus-visible:fill-brand-dark"
                  strokeWidth={2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${placeName(d)}: ${d.views} views`}
                  onMouseEnter={() => show(d.x, d.y - d.r, placeName(d), d.views)}
                  onFocus={() => show(d.x, d.y - d.r, placeName(d), d.views)}
                  onClick={() => show(d.x, d.y - d.r, placeName(d), d.views)}
                  onBlur={() => setActive(null)}
                />
              ))}
            </g>
          </svg>
        )}

        {/* Ghi tên trực tiếp cho vài thành phố lớn nhất (chế độ Nearby) */}
        {labels.map((l) => (
          <span
            key={l.key}
            aria-hidden
            className="pointer-events-none absolute text-xs leading-4 font-semibold whitespace-nowrap text-neutral-700"
            style={{ left: l.left, top: l.top, textShadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff" }}
          >
            {l.text}
          </span>
        ))}

        {active && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-neutral-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
            style={{ left: `clamp(70px, ${(active.x / W) * 100}%, calc(100% - 70px))`, top: `calc(${(active.y / H) * 100}% - 6px)` }}
          >
            <p className="font-semibold">{active.title}</p>
            <p className="tabular-nums">{active.detail}</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        {view === "world" ? (
          <p className="flex items-center gap-1.5" aria-label="Country shading: lighter means fewer views, darker means more">
            Fewer
            {STEPS.map((c) => (
              <span key={c} className="inline-block h-2.5 w-5 rounded-sm" style={{ background: c }} />
            ))}
            More views by country
          </p>
        ) : (
          <span />
        )}
        {view !== "world" && dots.outside > 0 && (
          <button type="button" onClick={() => setView(view === "local" ? "us" : "world")} className="font-semibold text-brand">
            {dots.outside.toLocaleString("en-US")} views {view === "local" ? "outside this area · see United States" : "from outside the US · see World"}
          </button>
        )}
      </div>
    </div>
  );
}
