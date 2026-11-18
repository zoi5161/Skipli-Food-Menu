import type { Metadata } from "next";
import { Suspense } from "react";
import { loadMenu } from "@/lib/menu/load";
import { requireRestaurant } from "@/lib/restaurant";
import { MENU_TABS, type MenuTab } from "./tabs";
import { MenuEditor } from "./ui/menu-editor";

export const metadata: Metadata = { title: "Menu · Skipli Food Menu" };

async function MenuContent({ searchParams }: { searchParams: PageProps<"/dashboard/menu">["searchParams"] }) {
  const [{ restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const tab = (MENU_TABS as readonly string[]).includes(String(params.tab)) ? (params.tab as MenuTab) : "items";
  const data = await loadMenu(restaurant);
  return <MenuEditor data={data} tab={tab} />;
}

function MenuSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="h-9 w-32 animate-pulse rounded-lg bg-neutral-200" />
      <div className="h-10 w-80 animate-pulse rounded-full bg-neutral-200" />
      <div className="h-64 animate-pulse rounded-2xl bg-neutral-200" />
    </div>
  );
}

export default function MenuPage(props: PageProps<"/dashboard/menu">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent searchParams={props.searchParams} />
    </Suspense>
  );
}
