import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { requireRestaurant } from "@/lib/restaurant";
import { previewPath } from "@/lib/restaurant-path";
import { DashboardNav } from "./nav";

// Khung của một quán trong Studio: tên quán + các mục Overview · Menu · Stats · Settings
// (menu trái trên máy tính, thanh tab trên điện thoại).
async function RestaurantBar() {
  const { restaurant } = await requireRestaurant();
  return (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate font-semibold">{restaurant.name}</span>
        <span className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tracking-wider text-neutral-500 sm:inline">
          {restaurant.plan}
        </span>
      </span>
      <Link href={previewPath(restaurant.id)} className="ml-auto hidden shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-900 sm:inline">
        View live menu
      </Link>
    </>
  );
}

export default function RestaurantLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-neutral-200 bg-white">
        <div className="flex h-12 items-center gap-3 px-4 sm:px-6">
          <Link href="/restaurants" className="shrink-0 text-sm font-medium text-neutral-500 hover:text-neutral-900">
            ← All restaurants
          </Link>
          <span className="h-4 w-px bg-neutral-200" />
          <Suspense fallback={<span className="h-4 w-32 animate-pulse rounded bg-neutral-100" />}>
            <RestaurantBar />
          </Suspense>
        </div>
        {/* Thanh mục đọc id quán từ đường dẫn: đặt trong <Suspense> để khung trang hiện ngay */}
        <Suspense fallback={<div className="h-10 md:hidden" />}>
          <DashboardNav variant="tabs" />
        </Suspense>
      </div>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white p-3 md:block">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-neutral-100" />}>
            <DashboardNav variant="sidebar" />
          </Suspense>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </>
  );
}
