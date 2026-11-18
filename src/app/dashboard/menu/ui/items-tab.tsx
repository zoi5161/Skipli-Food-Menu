"use client";

import { useOptimistic, useState, useTransition } from "react";
import { SortableList } from "@/components/sortable-list";
import { Button, EmptyState, Toggle, cx, useToast } from "@/components/ui";
import { DIETARY_LABEL, allergenCode, centsToInput, formatServingTimes } from "@/lib/menu/format";
import type { MenuCategory, MenuData, MenuItemRow } from "@/lib/menu/types";
import { reorder, setItemFlags, setItemPrice } from "../actions";
import { CategoryDialog } from "./category-dialog";
import { ItemDialog } from "./item-dialog";
import { Badge, PencilIcon } from "./shared";

type Editing = { kind: "item"; item: MenuItemRow | null; categoryId?: string } | { kind: "category" } | null;

export function ItemsTab({ data }: { data: MenuData }) {
  const [editing, setEditing] = useState<Editing>(null);
  const allergenCodes = new Map(data.allergens.map((a, i) => [a.id, allergenCode(i)]));

  if (data.categories.length === 0) {
    return (
      <>
        <EmptyState
          title="Start with a category."
          text="Items live inside categories, like Pizzas, Drinks, Desserts. Add one and your first dish goes in it."
          action={<Button onClick={() => setEditing({ kind: "category" })}>Add a category</Button>}
        />
        {editing?.kind === "category" && <CategoryDialog category={null} onClose={() => setEditing(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-8">
      {data.categories.map((category) => {
        const items = data.items.filter((i) => i.categoryId === category.id);
        return (
          <CategorySection
            key={category.id}
            category={category}
            items={items}
            currency={data.restaurant.currency}
            allergenCodes={allergenCodes}
            onEdit={(item) => setEditing({ kind: "item", item })}
            onAdd={() => setEditing({ kind: "item", item: null, categoryId: category.id })}
          />
        );
      })}

      {editing?.kind === "item" && (
        <ItemDialog
          key={editing.item?.id ?? "new"}
          data={data}
          item={editing.item}
          defaultCategoryId={editing.categoryId}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CategorySection({
  category,
  items,
  currency,
  allergenCodes,
  onEdit,
  onAdd,
}: {
  category: MenuCategory;
  items: MenuItemRow[];
  currency: string;
  allergenCodes: Map<string, string>;
  onEdit: (item: MenuItemRow) => void;
  onAdd: () => void;
}) {
  const serving = formatServingTimes(category.servingDays, category.servingFrom, category.servingUntil);
  return (
    <section aria-label={category.name}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">{category.name}</h2>
        {serving && <span className="text-sm text-neutral-500">{serving}</span>}
        {!category.isVisible && <Badge>Hidden</Badge>}
        <span className="text-sm text-neutral-400">{items.length} {items.length === 1 ? "item" : "items"}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {items.length > 0 && (
          <SortableList
            items={items}
            onReorder={(ids) => reorder("item", ids)}
            className="divide-y divide-neutral-100"
            renderItem={(item, handle) => (
              <ItemRow item={item} handle={handle} currency={currency} allergenCodes={allergenCodes} onEdit={() => onEdit(item)} />
            )}
          />
        )}
        <button
          type="button"
          onClick={onAdd}
          className={cx(
            "flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-soft/60",
            items.length > 0 && "border-t border-neutral-100",
          )}
        >
          <span className="text-lg leading-none">+</span> Add an item to {category.name}
        </button>
      </div>
    </section>
  );
}

function ItemRow({
  item,
  handle,
  currency,
  allergenCodes,
  onEdit,
}: {
  item: MenuItemRow;
  handle: React.ReactNode;
  currency: string;
  allergenCodes: Map<string, string>;
  onEdit: () => void;
}) {
  // Bật/tắt hiện ngay trên màn hình, lưu sau; lỗi thì tự quay lại như cũ.
  const [flags, setFlags] = useOptimistic({ isSoldOut: item.isSoldOut, isVisible: item.isVisible });
  const [, startTransition] = useTransition();
  const toast = useToast();

  function update(next: { isSoldOut?: boolean; isVisible?: boolean }) {
    startTransition(async () => {
      setFlags({ ...flags, ...next });
      const result = await setItemFlags(item.id, next).catch(() => ({ ok: false as const, error: "Could not save" }));
      if (!result.ok) toast(result.error, "error");
      else if (next.isSoldOut !== undefined) toast(next.isSoldOut ? `${item.name}: sold out` : `${item.name}: back on the menu`);
    });
  }

  const codes = item.allergenIds.map((id) => allergenCodes.get(id)).filter(Boolean).join(", ");

  return (
    <div className={cx("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:px-4", !flags.isVisible && "bg-neutral-50")}>
      {handle}
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={cx("font-medium", !flags.isVisible && "text-neutral-400")}>{item.name}</span>
        {codes && <sup className="ml-1 font-mono text-[11px] text-neutral-500">{codes}</sup>}
        <span className="mt-1 flex flex-wrap gap-1">
          {flags.isSoldOut && <Badge tone="amber">Sold out</Badge>}
          {!flags.isVisible && <Badge>Hidden</Badge>}
          {item.dietaryTags.map((t) => (
            <Badge key={t} tone="green">
              {DIETARY_LABEL[t]}
            </Badge>
          ))}
        </span>
      </button>

      {/* Hàng thứ hai trên điện thoại: giá + công tắc */}
      <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
        <QuickPrice key={item.priceCents ?? "none"} item={item} currency={currency} />
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="whitespace-nowrap">Sold out</span>
          <Toggle checked={flags.isSoldOut} onChange={(v) => update({ isSoldOut: v })} label={`Sold out: ${item.name}`} tone="amber" />
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Show</span>
          <Toggle checked={flags.isVisible} onChange={(v) => update({ isVisible: v })} label={`Show on menu: ${item.name}`} />
        </label>
        <button type="button" onClick={onEdit} aria-label={`Edit ${item.name}`} className="ml-auto rounded-full p-2 text-neutral-500 hover:bg-neutral-100 sm:ml-0">
          <PencilIcon />
        </button>
      </div>
    </div>
  );
}

/** Ô giá sửa nhanh: gõ giá mới rồi bấm Enter hoặc chạm ra ngoài là lưu. */
function QuickPrice({ item, currency }: { item: MenuItemRow; currency: string }) {
  const original = centsToInput(item.priceCents);
  const [value, setValue] = useState(original);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function commit() {
    if (value.trim() === original) return;
    startTransition(async () => {
      const result = await setItemPrice(item.id, value).catch(() => ({ ok: false as const, error: "Could not save" }));
      if (result.ok) toast(`${item.name}: price saved`);
      else {
        toast(result.error, "error");
        setValue(original);
      }
    });
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-neutral-400">
        {currency === "USD" ? "$" : currency}
      </span>
      <input
        aria-label={`Price of ${item.name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setValue(original);
        }}
        inputMode="decimal"
        placeholder="—"
        disabled={pending}
        className="w-20 rounded-lg border border-transparent bg-neutral-100 sm:w-24 py-1.5 pr-2 pl-6 text-right text-base tabular-nums outline-none focus:border-brand focus:bg-white sm:text-sm"
      />
    </div>
  );
}
