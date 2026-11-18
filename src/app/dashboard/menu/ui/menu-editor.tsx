"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ToastProvider, cx } from "@/components/ui";
import type { MenuData } from "@/lib/menu/types";
import { CategoriesTab } from "./categories-tab";
import { CategoryDialog } from "./category-dialog";
import { ItemDialog } from "./item-dialog";
import { ItemsTab } from "./items-tab";
import { AllergensTab, ExtrasTab } from "./simple-list-tab";
import { MENU_TABS, TAB_LABEL, type MenuTab } from "../tabs";

export function MenuEditor({ data, tab }: { data: MenuData; tab: MenuTab }) {
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
            <Button onClick={() => setAdding(true)} className="px-5 py-2.5">
              {tab === "items" && hasCategories ? "Add an item" : "Add a category"}
            </Button>
          )}
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Menu sections">
          {MENU_TABS.map((t) => (
            <Link
              key={t}
              href={t === "items" ? "/dashboard/menu" : `/dashboard/menu?tab=${t}`}
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
