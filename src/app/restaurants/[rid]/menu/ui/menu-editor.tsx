"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ToastProvider, cx } from "@/components/ui";
import type { MenuData } from "@/lib/menu/types";
import { restaurantPath } from "@/lib/restaurant-path";
import { CategoriesTab } from "./categories-tab";
import { CategoryDialog } from "./category-dialog";
import { ItemDialog } from "./item-dialog";
import { ItemsTab } from "./items-tab";
import { HistoryTab, type SnapshotRow } from "./history-tab";
import { ScanMenuButton, ScanMenuDialog, type ReadyJob } from "./scan-menu";
import { AllergensTab, ExtrasTab } from "./simple-list-tab";
import { MENU_TABS, TAB_LABEL, type MenuTab } from "../tabs";

export function MenuEditor({
  data,
  tab,
  history = [],
  readyJobs = [],
  review = null,
}: {
  data: MenuData;
  tab: MenuTab;
  history?: SnapshotRow[];
  readyJobs?: { id: string; fileName: string; dishes: number }[];
  review?: ReadyJob | null;
}) {
  const { rid } = useParams<{ rid: string }>();
  const router = useRouter();
  const closeReview = () => router.replace(restaurantPath(rid, "menu", tab === "items" ? undefined : { tab }), { scroll: false });
  const [adding, setAdding] = useState(false);
  const hasCategories = data.categories.length > 0;
  const { items, categories } = data;

  return (
    <ToastProvider>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Menu</h1>
            <p className="mt-1 text-neutral-600">
              {items.length} {items.length === 1 ? "item" : "items"} across {categories.length}{" "}
              {categories.length === 1 ? "category" : "categories"}.
            </p>
          </div>
          {(tab === "items" || tab === "categories") && (
            <div className="flex flex-wrap gap-2">
              <ScanMenuButton existingCategories={categories.map((c) => c.name)} dishCount={items.length} variant={hasCategories ? "secondary" : "primary"} />
              <Button onClick={() => setAdding(true)} className="px-5 py-2.5" variant={hasCategories ? "primary" : "secondary"}>
                {tab === "items" && hasCategories ? "Add an item" : "Add a category"}
              </Button>
            </div>
          )}
        </div>

        {readyJobs.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4" role="region" aria-label="Uploads ready to review">
            <p className="font-semibold text-amber-900">
              {readyJobs.length === 1 ? "A menu file is ready to review" : `${readyJobs.length} menu files are ready to review`}
            </p>
            {readyJobs.map((j) => (
              <div key={j.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-amber-900">
                  {j.fileName} · {j.dishes} dishes
                </span>
                <Link href={restaurantPath(rid, "menu", { review: j.id })} scroll={false} className="rounded-full bg-amber-600 px-4 py-1.5 font-semibold text-white hover:bg-amber-700">
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}

        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Menu sections">
          {MENU_TABS.map((t) => (
            <Link
              key={t}
              href={restaurantPath(rid, "menu", t === "items" ? undefined : { tab: t })}
              aria-current={t === tab ? "page" : undefined}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap",
                t === tab ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-200/60",
              )}
            >
              {TAB_LABEL[t]}
            </Link>
          ))}
        </nav>

        {tab === "items" && <ItemsTab data={data} />}
        {tab === "categories" && <CategoriesTab data={data} />}
        {tab === "extras" && <ExtrasTab data={data} />}
        {tab === "allergens" && <AllergensTab data={data} />}
        {tab === "history" && <HistoryTab rows={history} currency={data.restaurant.currency} />}

        {review && (
          <ScanMenuDialog key={review.id} existingCategories={categories.map((c) => c.name)} dishCount={items.length} job={review} onClose={closeReview} />
        )}

        {adding &&
          (tab === "items" && hasCategories ? (
            <ItemDialog data={data} item={null} onClose={() => setAdding(false)} />
          ) : (
            <CategoryDialog category={null} onClose={() => setAdding(false)} />
          ))}
      </div>
    </ToastProvider>
  );
}
