"use client";

import { useOptimistic, useState, useTransition } from "react";
import { SortableList } from "@/components/sortable-list";
import { Button, EmptyState, Toggle, useToast } from "@/components/ui";
import { formatServingTimes } from "@/lib/menu/format";
import type { MenuCategory, MenuData } from "@/lib/menu/types";
import { reorder, setCategoryVisible } from "../actions";
import { CategoryDialog } from "./category-dialog";
import { PencilIcon } from "./shared";

export function CategoriesTab({ data }: { data: MenuData }) {
  const [editing, setEditing] = useState<MenuCategory | "new" | null>(null);
  const countFor = (id: string) => data.items.filter((i) => i.categoryId === id).length;

  return (
    <div className="space-y-4">
      <p className="text-neutral-600">Drag to change the order guests see. Set serving times for things like breakfast.</p>

      {data.categories.length === 0 ? (
        <EmptyState title="No categories yet." text="Add one to start building your menu." action={<Button onClick={() => setEditing("new")}>Add a category</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <SortableList
            items={data.categories}
            onReorder={(ids) => reorder("category", ids)}
            className="divide-y divide-neutral-100"
            renderItem={(category, handle) => (
              <CategoryRow category={category} handle={handle} itemCount={countFor(category.id)} onEdit={() => setEditing(category)} />
            )}
          />
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex w-full items-center gap-2 border-t border-neutral-100 px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-soft/60"
          >
            <span className="text-lg leading-none">+</span> Add a category
          </button>
        </div>
      )}

      {editing && (
        <CategoryDialog
          key={editing === "new" ? "new" : editing.id}
          category={editing === "new" ? null : editing}
          itemCount={editing === "new" ? 0 : countFor(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CategoryRow({
  category,
  handle,
  itemCount,
  onEdit,
}: {
  category: MenuCategory;
  handle: React.ReactNode;
  itemCount: number;
  onEdit: () => void;
}) {
  const [visible, setVisible] = useOptimistic(category.isVisible);
  const [, startTransition] = useTransition();
  const toast = useToast();
  const serving = formatServingTimes(category.servingDays, category.servingFrom, category.servingUntil);

  function toggle(next: boolean) {
    startTransition(async () => {
      setVisible(next);
      const r = await setCategoryVisible(category.id, next).catch(() => ({ ok: false as const, error: "Could not save" }));
      if (!r.ok) toast(r.error, "error");
    });
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
      {handle}
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={visible ? "font-medium" : "font-medium text-neutral-400"}>{category.name}</span>
        <span className="block text-sm text-neutral-500">
          {itemCount} {itemCount === 1 ? "item" : "items"}
          {serving ? ` · ${serving}` : ""}
        </span>
      </button>
      <Toggle checked={visible} onChange={toggle} label={`Show ${category.name} on menu`} />
      <button type="button" onClick={onEdit} aria-label={`Edit ${category.name}`} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
        <PencilIcon />
      </button>
    </div>
  );
}
