import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PageLoading } from "@/components/page-loading";
import { ColumnChart, type ColumnPoint } from "@/components/charts";
import { VisitorMap } from "@/components/visitor-map";
import type { Device, Source } from "@/lib/analytics/classify";
import { RANGES, loadStats, type RangeDays, type Stats, type Totals } from "@/lib/analytics/stats";
import { DAY_NAMES } from "@/lib/menu/hours";
import { requireRestaurant } from "@/lib/restaurant";
import { US_TIME_ZONES } from "@/lib/timezones";

export const metadata: Metadata = { title: "Stats · Skipli Food Menu" };

// Trang thống kê của chủ quán: lượt xem theo ngày, giờ đông khách, món được xem nhiều,
// khách đến từ đâu, dùng máy gì, ở thành phố nào.

const SOURCE_LABEL: Record<Source, string> = {
  QR: "QR code scans",
  DIRECT: "Direct link or messages",
  GOOGLE: "Google",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  OTHER: "Other websites",
};
const DEVICE_LABEL: Record<Device, string> = { MOBILE: "Phone", TABLET: "Tablet", DESKTOP: "Computer" };

const dayDate = (key: string) => new Date(`${key}T12:00:00Z`);
const fmtDay = (key: string, opts: Intl.DateTimeFormatOptions) => dayDate(key).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 ${className}`} aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Delta({ now, before, range }: { now: number; before: number; range: number }) {
  if (before === 0 && now === 0) return <p className="text-xs text-neutral-400">No change</p>;
  if (before === 0) return <p className="text-xs text-neutral-500">New this period</p>;
  const change = Math.round(((now - before) / before) * 100);
  const up = change >= 0;
  return (
    <p className={`text-xs font-medium ${up ? "text-emerald-700" : "text-red-700"}`}>
      <span aria-hidden>{up ? "▲" : "▼"}</span> {Math.abs(change)}%<span className="font-normal text-neutral-500"> vs previous {range} days</span>
    </p>
  );
}

function Tiles({ totals, previous, range }: { totals: Totals; previous: Totals; range: number }) {
  const tiles: { label: string; key: keyof Totals; hint: string }[] = [
    { label: "Menu views", key: "views", hint: "Times your page was opened" },
    { label: "Visitors", key: "visitors", hint: "Different guests, counted per day" },
    { label: "Dish taps", key: "taps", hint: "Guests opening a dish for details" },
    { label: "QR scans", key: "qr", hint: "Views that came from your QR code" },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.key} className="bg-white p-5" title={t.hint}>
          <p className="text-sm text-neutral-500">{t.label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid={`stat-${t.key}`}>
            {totals[t.key].toLocaleString("en-US")}
          </p>
          <Delta now={totals[t.key]} before={previous[t.key]} range={range} />
        </div>
      ))}
    </div>
  );
}

/** Thanh ngang có ghi số (dùng khi cần đọc số chính xác). */
function BarRow({ label, value, max, suffix, lead }: { label: ReactNode; value: number; max: number; suffix?: string; lead?: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      {lead}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate">{label}</span>
          <span className="shrink-0 font-semibold tabular-nums">
            {value.toLocaleString("en-US")}
            {suffix && <span className="ml-1.5 font-normal text-neutral-500">{suffix}</span>}
          </span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-brand-soft">
          <div className="h-2 rounded-full bg-brand" style={{ width: `${max === 0 ? 0 : Math.max(2, (value / max) * 100)}%` }} />
        </div>
      </div>
    </li>
  );
}

function dailyPoints(s: Stats): ColumnPoint[] {
  const every = s.range === 7 ? 1 : s.range === 30 ? 5 : 15;
  return s.daily.map((d, i) => ({
    key: d.day,
    title: fmtDay(d.day, { weekday: "short", month: "short", day: "numeric" }),
    axisLabel: s.range === 7 ? fmtDay(d.day, { weekday: "short" }) : (s.daily.length - 1 - i) % every === 0 ? fmtDay(d.day, { month: "short", day: "numeric" }) : undefined,
    value: d.views,
    detail: `${d.visitors} ${d.visitors === 1 ? "visitor" : "visitors"}`,
    highlight: d.day === s.today,
  }));
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <p className="text-lg font-semibold">No views yet in this period</p>
      <p className="mx-auto mt-1 max-w-md text-neutral-600">
        Put your QR code on tables, add your link to Instagram and Google, and stats will show up here as guests open your menu.
      </p>
      <Link href="/dashboard" className="mt-4 inline-flex rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
        Get your QR code
      </Link>
    </div>
  );
}

async function StatsContent({ searchParams }: { searchParams: PageProps<"/dashboard/stats">["searchParams"] }) {
  const [{ restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const range = (RANGES as readonly number[]).includes(Number(params.range)) ? (Number(params.range) as RangeDays) : 30;
  const s = await loadStats(restaurant.id, restaurant.timeZone, range);
  const tzLabel = US_TIME_ZONES.find((z) => z.id === s.timeZone)?.label.split(" (")[0] ?? s.timeZone;

  const peakHour = s.hours.indexOf(Math.max(...s.hours));
  const peakDay = s.weekdays.indexOf(Math.max(...s.weekdays));
  const sourceTotal = s.sources.reduce((a, x) => a + x.views, 0);
  const deviceTotal = s.devices.reduce((a, x) => a + x.views, 0);
  const placesKnown = s.places.some((p) => p.city || p.country);
  const empty = s.totals.views === 0 && s.totals.taps === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Stats</h1>
          <p className="mt-1 text-sm text-neutral-500">Days and hours in {tzLabel} time.</p>
        </div>
        <nav aria-label="Time range" className="flex gap-1 rounded-full bg-neutral-200/70 p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/dashboard/stats" : `/dashboard/stats?range=${r}`}
              aria-current={r === range ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${r === range ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <Tiles totals={s.totals} previous={s.previous} range={range} />

      {empty ? (
        <EmptyState />
      ) : (
        <>
          <Card title="Menu views per day" subtitle={`Last ${range} days. Today is the darker bar.`}>
            <ColumnChart points={dailyPoints(s)} label={`Menu views per day, last ${range} days`} unit="views" tableHeaders={["Day", "Views"]} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Busiest hours"
              subtitle={s.totals.views > 0 ? `Most views around ${hourLabel(peakHour)}. Busiest day: ${DAY_NAMES[peakDay]}.` : undefined}
            >
              <ColumnChart
                height={150}
                label={`Menu views by hour of day, last ${range} days`}
                unit="views"
                tableHeaders={["Hour", "Views"]}
                points={s.hours.map((n, h) => ({
                  key: String(h),
                  title: `${hourLabel(h)} – ${hourLabel((h + 1) % 24)}`,
                  axisLabel: h % 6 === 0 ? hourLabel(h).replace(" ", "").toLowerCase().replace("m", "") : undefined,
                  value: n,
                  highlight: h === peakHour && n > 0,
                }))}
              />
            </Card>

            <Card title="How guests find you" subtitle="Where each menu view came from.">
              <ul className="space-y-4">
                {s.sources.map((x) => (
                  <BarRow key={x.source} label={SOURCE_LABEL[x.source]} value={x.views} max={s.sources[0]?.views ?? 0} suffix={`${pct(x.views, sourceTotal)}%`} />
                ))}
              </ul>
              {s.referrers.length > 0 && (
                <p className="mt-4 text-sm text-neutral-500">Other websites: {s.referrers.map((r) => `${r.host} (${r.views})`).join(", ")}</p>
              )}
              <p className="mt-4 text-xs text-neutral-500">Tip: add ?src=ig to the link in your Instagram bio and ?src=google to your Google listing to see them separately.</p>
            </Card>
          </div>

          <Card
            title="Most viewed dishes"
            subtitle={
              s.totalItems > 0 && s.untappedCount > 0
                ? `${s.untappedCount} of ${s.totalItems} dishes weren’t opened in this period. A photo or a better description can help.`
                : "Guests tapping a dish to see details, extras and allergens."
            }
          >
            {s.topItems.length === 0 ? (
              <p className="text-sm text-neutral-500">No dish taps yet in this period.</p>
            ) : (
              <ol className="grid gap-x-10 gap-y-4 md:grid-cols-2" aria-label="Most viewed dishes">
                {s.topItems.map((it, i) => (
                  <BarRow
                    key={it.id}
                    max={s.topItems[0].taps}
                    value={it.taps}
                    suffix={it.taps === 1 ? "tap" : "taps"}
                    label={
                      <>
                        <span className="mr-2 text-neutral-400 tabular-nums">{i + 1}</span>
                        {it.name}
                      </>
                    }
                    lead={
                      it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ảnh nhỏ của món
                        <img src={it.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100" aria-hidden />
                      )
                    }
                  />
                ))}
              </ol>
            )}
          </Card>

          <Card title="Where guests are" subtitle="City level only, based on the guest’s internet provider. We never store exact locations or IP addresses.">
            {s.mapPoints.length > 0 ? (
              <VisitorMap points={s.mapPoints} countries={s.countries} />
            ) : (
              <p className="text-sm text-neutral-500">The map fills in once your page is online. Locations aren’t available on a test computer.</p>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Card title="Top places" subtitle="Exact numbers, including cities that sit close together on the map.">
              {placesKnown ? (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-neutral-500">
                    <tr>
                      <th className="pb-2 font-medium">Place</th>
                      <th className="pb-2 text-right font-medium">Views</th>
                      <th className="pb-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {s.places.map((p, i) => (
                      <tr key={i}>
                        <td className="py-2">{[p.city, p.region, p.country].filter(Boolean).join(", ") || <span className="text-neutral-400">Unknown</span>}</td>
                        <td className="py-2 text-right tabular-nums">{p.views.toLocaleString("en-US")}</td>
                        <td className="py-2 text-right text-neutral-500 tabular-nums">{pct(p.views, s.totals.views)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-neutral-500">Locations appear once your page is online. They aren’t available on a test computer.</p>
              )}
            </Card>

            <Card title="Devices">
              <ul className="space-y-4">
                {s.devices.map((x) => (
                  <BarRow key={x.device} label={DEVICE_LABEL[x.device]} value={x.views} max={s.devices[0]?.views ?? 0} suffix={`${pct(x.views, deviceTotal)}%`} />
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <p className="text-xs text-neutral-500">
        Bots, link previews and your own visits aren’t counted. A guest counts once per 30 minutes, and once per dish every 5 minutes.
      </p>
    </div>
  );
}

export default function StatsPage(props: PageProps<"/dashboard/stats">) {
  return (
    <Suspense fallback={<PageLoading label="Loading stats…" width="max-w-5xl" blocks={["h-9 w-40", "h-28", "h-72"]} />}>
      <StatsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
