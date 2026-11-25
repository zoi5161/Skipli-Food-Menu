"use client";

// Tab Extra và tab Allergens dùng chung một kiểu danh sách: kéo thả, sửa ngay trong dòng.

import { useState } from "react";
import { SortableList } from "@/components/sortable-list";
import { Button, EmptyState, cx, inputClass } from "@/components/ui";
import { allergenCode, centsToInput, formatPrice } from "@/lib/menu/format";
import type { MenuData } from "@/lib/menu/types";
import { deleteAllergen, deleteExtra, reorder, saveAllergen, saveExtra } from "../actions";
import { PencilIcon, useSave } from "./shared";

type Row = { id: string; name: string; priceCents?: number };

export function ExtrasTab({ data }: { data: MenuData }) {
  return (
    <SimpleListTab
      kind="extra"
      intro="Optional extras guests can add to a dish: extra cheese, a side, a sauce. Attach them to items in the item editor."
      emptyTitle="No extras yet."
      emptyText="Add one to offer optional add-ons on your items."
      addLabel="Add an extra"
      namePlaceholder="Extra cheese"
      rows={data.extras}
      currency={data.restaurant.currency}
      usage={(id) => data.items.filter((i) => i.extraIds.includes(id)).length}
    />
  );
}

export function AllergensTab({ data }: { data: MenuData }) {
  return (
    <SimpleListTab
      kind="allergen"
      intro="Each allergen gets a short code (A, B, C…) that shows next to dishes on your menu. Drag to reorder."
      emptyTitle="No allergens yet."
      emptyText="Add one to start tagging menu items."
      addLabel="Add an allergen"
      namePlaceholder="Gluten"
      rows={data.allergens}
      currency={data.restaurant.currency}
      usage={(id) => data.items.filter((i) => i.allergenIds.includes(id)).length}
    />
  );
}

function SimpleListTab({
  kind,
  intro,
  emptyTitle,
  emptyText,
  addLabel,
  namePlaceholder,
  rows,
  currency,
  usage,
}: {
  kind: "extra" | "allergen";
  intro: string;
  emptyTitle: string;
  emptyText: string;
  addLabel: string;
  namePlaceholder: string;
  rows: Row[];
  currency: string;
  usage: (id: string) => number;
}) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const form = (row: Row | null) => (
    <RowForm
      kind={kind}
      row={row}
      currency={currency}
      namePlaceholder={namePlaceholder}
      usage={row ? usage(row.id) : 0}
      onDone={() => setEditingId(null)}
    />
  );

  return (
    <div className="space-y-4">
      <p className="text-neutral-600">{intro}</p>

      {rows.length === 0 && editingId !== "new" ? (
        <EmptyState title={emptyTitle} text={emptyText} action={<Button onClick={() => setEditingId("new")}>{addLabel}</Button>} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {rows.length > 0 && (
            <SortableList
              items={rows}
              onReorder={(ids) => reorder(kind, ids)}
              className="divide-y divide-neutral-100"
              renderItem={(row, handle, index) =>
                editingId === row.id ? (
                  form(row)
                ) : (
                  <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                    {handle}
                    {kind === "allergen" && (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-xs font-semibold text-white">
                        {allergenCode(index)}
                      </span>
                    )}
                    <button type="button" onClick={() => setEditingId(row.id)} className="min-w-0 flex-1 text-left">
                      <span className="font-medium">{row.name}</span>
                      <span className="block text-sm text-neutral-500">
                        Used on {usage(row.id)} {usage(row.id) === 1 ? "item" : "items"}
                      </span>
                    </button>
                    {kind === "extra" && <span className="text-sm tabular-nums">+{formatPrice(row.priceCents ?? 0, currency)}</span>}
                    <button type="button" onClick={() => setEditingId(row.id)} aria-label={`Edit ${row.name}`} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
                      <PencilIcon />
                    </button>
                  </div>
                )
              }
            />
          )}
          {editingId === "new" ? (
            <div className={cx(rows.length > 0 && "border-t border-neutral-100")}>{form(null)}</div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingId("new")}
              className="flex w-full items-center gap-2 border-t border-neutral-100 px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-soft/60"
            >
              <span className="text-lg leading-none">+</span> {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RowForm({
  kind,
  row,
  currency,
  namePlaceholder,
  usage,
  onDone,
}: {
  kind: "extra" | "allergen";
  row: Row | null;
  currency: string;
  namePlaceholder: string;
  usage: number;
  onDone: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [price, setPrice] = useState(row ? centsToInput(row.priceCents ?? 0) : "");
  const { run, pending } = useSave();

  function save() {
    run(
      () => (kind === "extra" ? saveExtra({ id: row?.id, name, price }) : saveAllergen({ id: row?.id, name })),
      row ? "Saved" : "Added",
      (r) => r.ok && onDone(),
    );
  }

  function remove() {
    if (!row) return;
    const note = usage > 0 ? ` It will be removed from ${usage} ${usage === 1 ? "item" : "items"}.` : "";
    if (!window.confirm(`Delete "${row.name}"?${note}`)) return;
    run(() => (kind === "extra" ? deleteExtra(row.id) : deleteAllergen(row.id)), "Deleted", (r) => r.ok && onDone());
  }

  return (
    <form
      className="space-y-3 bg-neutral-50 p-3 sm:p-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex gap-2">
        <input
          aria-label="Name"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          maxLength={60}
          autoFocus
        />
        {kind === "extra" && (
          <div className="relative w-32 shrink-0">
            <input
              aria-label="Price"
              className={cx(inputClass, "pr-12 text-right tabular-nums")}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">{currency}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {row && (
          <Button variant="danger" onClick={remove} disabled={pending}>
            Delete
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
