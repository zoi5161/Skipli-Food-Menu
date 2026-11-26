import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { db } from "@/lib/db";
import { loadMenu } from "@/lib/menu/load";
import { requireRestaurant } from "@/lib/restaurant";
import { MENU_TABS, type MenuTab } from "./tabs";
import { MenuEditor } from "./ui/menu-editor";
import type { ReadResult } from "./ui/scan-menu";

export const metadata: Metadata = { title: "Menu · Skipli Food Menu" };

async function MenuContent({ searchParams }: { searchParams: PageProps<"/restaurants/[rid]/menu">["searchParams"] }) {
  const [{ restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const tab = (MENU_TABS as readonly string[]).includes(String(params.tab)) ? (params.tab as MenuTab) : "items";
  const reviewId = typeof params.review === "string" ? params.review : null;
  const [data, snapshots, readyJobs] = await Promise.all([
    loadMenu(restaurant),
    tab === "history"
      ? db.menuSnapshot.findMany({
          where: { restaurantId: restaurant.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true, note: true, itemCount: true, categoryCount: true, createdByEmail: true },
        })
      : [],
    // File ở trang Bulk upload đã được AI đọc xong, chờ duyệt
    db.menuJob.findMany({
      where: { restaurantId: restaurant.id, status: "READY" },
      orderBy: { createdAt: "asc" },
      select: { id: true, fileName: true, dishes: true, result: true },
    }),
  ]);
  // Giờ theo múi giờ của quán, ví dụ "Nov 26, 9:41 AM"
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: restaurant.timeZone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const history = snapshots.map((s) => ({ id: s.id, when: fmt.format(s.createdAt), note: s.note, itemCount: s.itemCount, categoryCount: s.categoryCount, by: s.createdByEmail }));
  const ready = readyJobs.map((j) => ({ id: j.id, fileName: j.fileName, dishes: j.dishes }));
  const open = readyJobs.find((j) => j.id === reviewId);
  const review = open ? { id: open.id, fileName: open.fileName, result: open.result as unknown as ReadResult } : null;
  return <MenuEditor data={data} tab={tab} history={history} readyJobs={ready} review={review} />;
}

export default function MenuPage(props: PageProps<"/restaurants/[rid]/menu">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your menu…" />}>
      <MenuContent searchParams={props.searchParams} />
    </Suspense>
  );
}
