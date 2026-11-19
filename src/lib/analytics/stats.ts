import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isTimeZone } from "@/lib/timezones";
import type { Device, Source } from "./classify";

// Số liệu cho trang Stats của chủ quán. Ngày và giờ tính theo múi giờ của quán.
// Mỗi truy vấn chỉ đọc dữ liệu của một quán trong khoảng thời gian chọn
// (dùng chỉ mục restaurantId + createdAt), nên quán khác nhiều dữ liệu cũng không làm chậm.

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export type DayPoint = { day: string; views: number; visitors: number };
export type Totals = { views: number; visitors: number; taps: number; qr: number };

export type Stats = {
  range: RangeDays;
  timeZone: string;
  today: string;
  daily: DayPoint[];
  hours: number[]; // 24 phần tử: lượt xem theo giờ trong ngày
  weekdays: number[]; // 7 phần tử: 0 = Chủ nhật
  totals: Totals;
  previous: Totals;
  sources: { source: Source; views: number }[];
  referrers: { host: string; views: number }[];
  devices: { device: Device; views: number }[];
  places: { city: string | null; region: string | null; country: string | null; views: number }[];
  /** Chấm trên bản đồ: mỗi thành phố một chấm (tọa độ trung bình đã làm tròn). */
  mapPoints: { city: string | null; region: string | null; country: string | null; lat: number; lng: number; views: number }[];
  /** Lượt xem theo nước (mã 2 chữ), để tô màu bản đồ thế giới. */
  countries: { country: string; views: number }[];
  topItems: { id: string; name: string; imageUrl: string | null; taps: number }[];
  untappedCount: number;
  totalItems: number;
};

/** Giờ địa phương của quán, tính từ createdAt (lưu theo UTC, không kèm múi giờ). */
const local = (tz: string) => Prisma.sql`(("createdAt" at time zone 'UTC') at time zone ${tz})`;

export async function loadStats(restaurantId: string, timeZone: string, range: RangeDays): Promise<Stats> {
  const tz = isTimeZone(timeZone) ? timeZone : "America/New_York";

  // Mốc thời gian: đầu ngày (giờ quán) của khoảng đang xem và khoảng trước đó
  const [bounds] = await db.$queryRaw<{ start: Date; prevStart: Date; today: string }[]>`
    select ((date_trunc('day', now() at time zone ${tz}) - make_interval(days => ${range - 1})) at time zone ${tz}) as "start",
           ((date_trunc('day', now() at time zone ${tz}) - make_interval(days => ${2 * range - 1})) at time zone ${tz}) as "prevStart",
           to_char(now() at time zone ${tz}, 'YYYY-MM-DD') as "today"`;
  // Đổi mốc (có múi giờ) về giờ UTC không kèm múi giờ, đúng kiểu cột createdAt
  const since = Prisma.sql`(${bounds.start}::timestamptz at time zone 'UTC')`;
  const prevSince = Prisma.sql`(${bounds.prevStart}::timestamptz at time zone 'UTC')`;
  const views = Prisma.sql`"PageView" where "restaurantId" = ${restaurantId}`;
  const clicks = Prisma.sql`"ItemClick" where "restaurantId" = ${restaurantId}`;

  const [daily, hours, weekdays, sources, referrers, devices, places, topItems, prevViews, prevTaps, taps, itemCounts, mapPoints, countries] = await Promise.all([
    db.$queryRaw<{ day: string; views: number; visitors: number }[]>`
      select to_char(${local(tz)}, 'YYYY-MM-DD') as day, count(*)::int as views, count(distinct "visitorHash")::int as visitors
      from ${views} and "createdAt" >= ${since} group by 1 order by 1`,
    db.$queryRaw<{ h: number; n: number }[]>`
      select extract(hour from ${local(tz)})::int as h, count(*)::int as n from ${views} and "createdAt" >= ${since} group by 1`,
    db.$queryRaw<{ d: number; n: number }[]>`
      select extract(dow from ${local(tz)})::int as d, count(*)::int as n from ${views} and "createdAt" >= ${since} group by 1`,
    db.$queryRaw<{ source: Source; views: number }[]>`
      select source::text as source, count(*)::int as views from ${views} and "createdAt" >= ${since} group by 1 order by 2 desc`,
    db.$queryRaw<{ host: string; views: number }[]>`
      select "referrerHost" as host, count(*)::int as views from ${views} and "createdAt" >= ${since} and source = 'OTHER' and "referrerHost" is not null
      group by 1 order by 2 desc limit 5`,
    db.$queryRaw<{ device: Device; views: number }[]>`
      select device::text as device, count(*)::int as views from ${views} and "createdAt" >= ${since} group by 1 order by 2 desc`,
    db.$queryRaw<Stats["places"]>`
      select city, region, country, count(*)::int as views from ${views} and "createdAt" >= ${since}
      group by 1, 2, 3 order by 4 desc, 1 nulls last limit 8`,
    db.$queryRaw<Stats["topItems"]>`
      select i.id, i.name, i."imageUrl", count(*)::int as taps
      from "ItemClick" c join "MenuItem" i on i.id = c."itemId"
      where c."restaurantId" = ${restaurantId} and c."createdAt" >= ${since}
      group by i.id order by taps desc, i.name limit 10`,
    db.$queryRaw<{ views: number; visitors: number; qr: number }[]>`
      select count(*)::int as views,
             count(distinct (to_char(${local(tz)}, 'YYYY-MM-DD') || "visitorHash"))::int as visitors,
             count(*) filter (where source = 'QR')::int as qr
      from ${views} and "createdAt" >= ${prevSince} and "createdAt" < ${since}`,
    db.$queryRaw<{ n: number }[]>`select count(*)::int as n from ${clicks} and "createdAt" >= ${prevSince} and "createdAt" < ${since}`,
    db.$queryRaw<{ n: number; items: number }[]>`select count(*)::int as n, count(distinct "itemId")::int as items from ${clicks} and "createdAt" >= ${since}`,
    db.menuItem.count({ where: { restaurantId, isVisible: true } }),
    db.$queryRaw<Stats["mapPoints"]>`
      select city, region, country, round(avg(latitude)::numeric, 1)::float8 as lat, round(avg(longitude)::numeric, 1)::float8 as lng, count(*)::int as views
      from ${views} and "createdAt" >= ${since} and latitude is not null and longitude is not null
      group by 1, 2, 3 order by views desc limit 500`,
    db.$queryRaw<Stats["countries"]>`
      select country, count(*)::int as views from ${views} and "createdAt" >= ${since} and country is not null group by 1 order by 2 desc`,
  ]);

  // Điền 0 cho những ngày không có lượt xem
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const days: DayPoint[] = [];
  const [y, m, d] = bounds.today.split("-").map(Number);
  for (let i = range - 1; i >= 0; i--) {
    const key = new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10);
    days.push(byDay.get(key) ?? { day: key, views: 0, visitors: 0 });
  }
  const hourArr = Array.from({ length: 24 }, (_, h) => hours.find((x) => x.h === h)?.n ?? 0);
  const dayArr = Array.from({ length: 7 }, (_, w) => weekdays.find((x) => x.d === w)?.n ?? 0);

  return {
    range,
    timeZone: tz,
    today: bounds.today,
    daily: days,
    hours: hourArr,
    weekdays: dayArr,
    totals: {
      views: days.reduce((s, x) => s + x.views, 0),
      visitors: days.reduce((s, x) => s + x.visitors, 0), // khách khác nhau mỗi ngày, cộng lại
      taps: taps[0].n,
      qr: sources.find((s) => s.source === "QR")?.views ?? 0,
    },
    previous: { views: prevViews[0].views, visitors: prevViews[0].visitors, taps: prevTaps[0].n, qr: prevViews[0].qr },
    sources,
    referrers,
    devices,
    places,
    topItems,
    mapPoints,
    countries,
    untappedCount: Math.max(0, itemCounts - taps[0].items),
    totalItems: itemCounts,
  };
}
