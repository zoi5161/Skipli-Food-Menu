import type { Metadata } from "next";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { loadMenu } from "@/lib/menu/load";
import { requireRestaurant } from "@/lib/restaurant";
import { MENU_TABS, type MenuTab } from "./tabs";
import { MenuEditor } from "./ui/menu-editor";

export const metadata: Metadata = { title: "Menu · Skipli Food Menu" };

async function MenuContent({ searchParams }: { searchParams: PageProps<"/restaurants/[rid]/menu">["searchParams"] }) {
  const [{ restaurant }, params] = await Promise.all([requireRestaurant(), searchParams]);
  const tab = (MENU_TABS as readonly string[]).includes(String(params.tab)) ? (params.tab as MenuTab) : "items";
  const data = await loadMenu(restaurant);
  return <MenuEditor data={data} tab={tab} />;
}

export default function MenuPage(props: PageProps<"/restaurants/[rid]/menu">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your menu…" />}>
      <MenuContent searchParams={props.searchParams} />
    </Suspense>
  );
}
