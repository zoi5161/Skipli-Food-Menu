import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { QrCard } from "@/components/qr-card";
import { loadStats } from "@/lib/analytics/stats";
import { publicSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Dashboard · Skipli Food Menu" };

// Trang tổng quan: số liệu 7 ngày, tình trạng trang, mã QR.
async function Overview() {
  const { restaurant } = await requireRestaurant();
  const where = { restaurantId: restaurant.id };
  const [week, items, categories, extras, allergens, soldOut] = await Promise.all([
    loadStats(restaurant.id, restaurant.timeZone, 7),
    db.menuItem.count({ where }),
    db.category.count({ where }),
    db.extra.count({ where }),
    db.allergen.count({ where }),
    db.menuItem.count({ where: { ...where, isSoldOut: true } }),
  ]);
  // Tên miền lấy từ cấu hình (NEXT_PUBLIC_APP_URL, hoặc REMOTE_APP_URL khi dùng chung database với bản trên mạng).
  const host = new URL(publicSiteUrl()).host;
  const publicPath = `${host}/@${restaurant.slug}`;

  const stats = [
    { label: "Menu items", value: items },
    { label: "Categories", value: categories },
    { label: "Extra", value: extras },
    { label: "Allergens", value: allergens },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        <p className="mt-1 font-mono text-sm text-neutral-500">{publicPath}</p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5" aria-labelledby="week-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="week-title" className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
            Last 7 days
          </h2>
          <Link href="/dashboard/stats" className="text-sm font-semibold text-brand">
            See all stats
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4">
          {[
            { label: "Menu views", value: week.totals.views },
            { label: "QR scans", value: week.totals.qr },
            { label: "Dish taps", value: week.totals.taps },
          ].map((x) => (
            <div key={x.label}>
              <p className="text-2xl font-semibold tabular-nums">{x.value.toLocaleString("en-US")}</p>
              <p className="text-sm text-neutral-500">{x.label}</p>
            </div>
          ))}
        </div>
        {week.topItems[0] && (
          <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
            Most viewed dish: <span className="font-semibold text-neutral-900">{week.topItems[0].name}</span>
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-5">
            <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-sm text-neutral-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">Page status</p>
          <p className="mt-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${restaurant.isPublished ? "bg-green-600" : "bg-red-500"}`} />
            <span className="font-medium">{restaurant.isPublished ? "Live" : "Off"}</span>
            <span className="text-neutral-500">{restaurant.isPublished ? "· guests can open your menu" : "· not live yet"}</span>
          </p>
          <p className="mt-3 flex gap-4 text-sm font-semibold">
            <Link href="/dashboard/settings?tab=page" className="text-brand">
              {restaurant.isPublished ? "Page settings" : "Turn it on"}
            </Link>
            <Link href="/preview" className="text-brand">
              Preview
            </Link>
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">Sold out right now</p>
          <p className="mt-2">
            <span className="text-2xl font-semibold tabular-nums">{soldOut}</span>{" "}
            <span className="text-neutral-500">{soldOut === 1 ? "item" : "items"}</span>
          </p>
        </div>
      </div>

      <QrCard slug={restaurant.slug} publicUrl={publicPath} />

      <Link href="/dashboard/menu" className="inline-flex rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark">
        {items === 0 ? "Start your menu" : "Edit menu"}
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 max-w-4xl animate-pulse rounded-2xl bg-neutral-200" />}>
      <Overview />
    </Suspense>
  );
}
