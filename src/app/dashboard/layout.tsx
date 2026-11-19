import Link from "next/link";
import { Brand } from "@/components/brand";
import { Suspense, type ReactNode } from "react";
import { requireRestaurant } from "@/lib/restaurant";
import { signOutAction } from "./actions";
import { DashboardNav } from "./nav";

// Khung chung của trang chủ quán: thanh trên + menu trái (máy tính) / thanh tab (điện thoại).
// Phần đọc phiên đăng nhập nằm trong <Suspense> để khung trang hiện ngay.
async function RestaurantName() {
  const { restaurant } = await requireRestaurant();
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">{restaurant.name}</span>
      <span className="hidden rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium tracking-wider text-neutral-500 sm:inline">
        {restaurant.plan}
      </span>
    </span>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="shrink-0" aria-label="Skipli Menu dashboard">
            <Brand size="sm" />
          </Link>
          <span className="h-5 w-px bg-neutral-200" />
          <Suspense fallback={<span className="h-4 w-32 animate-pulse rounded bg-neutral-100" />}>
            <RestaurantName />
          </Suspense>
          <Link href="/preview" className="ml-auto hidden text-sm font-medium text-neutral-500 hover:text-neutral-900 sm:inline">
            View live menu
          </Link>
          <form action={signOutAction} className="ml-auto sm:ml-0">
            <button type="submit" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </form>
        </div>
        <DashboardNav variant="tabs" />
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white p-3 md:block">
          <DashboardNav variant="sidebar" />
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
