"use client";

import { useState } from "react";
import { Button, Dialog, Field, Toggle, cx, inputClass } from "@/components/ui";
import { DIETARY_LABEL, DIETARY_TAGS, allergenCode, centsToInput, formatPrice, parsePriceInput, type DietaryTagValue } from "@/lib/menu/format";
import type { MenuData, MenuItemRow } from "@/lib/menu/types";
import { deleteItem, saveItem } from "../actions";
import { useSave } from "./shared";

/** Thêm hoặc sửa một món: tên, mô tả, giá, danh mục, nhãn chế độ ăn, dị ứng, extra. */
export function ItemDialog({
  data,
  item,
  defaultCategoryId,
  onClose,
}: {
  data: MenuData;
  item: MenuItemRow | null; // null = thêm mới
  defaultCategoryId?: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(centsToInput(item?.priceCents));
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? data.categories[0]?.id ?? "");
  const [tags, setTags] = useState<DietaryTagValue[]>(item?.dietaryTags ?? []);
  const [allergenIds, setAllergenIds] = useState<string[]>(item?.allergenIds ?? []);
  const [extraIds, setExtraIds] = useState<string[]>(item?.extraIds ?? []);
  const [isVisible, setIsVisible] = useState(item?.isVisible ?? true);
  const [isSoldOut, setIsSoldOut] = useState(item?.isSoldOut ?? false);
  const { run, pending } = useSave();

  const priceCheck = parsePriceInput(price);

  function toggleIn<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  function submit() {
    run(
      () =>
        saveItem({ id: item?.id, categoryId, name, description, price, dietaryTags: tags, allergenIds, extraIds, isVisible, isSoldOut }),
      item ? "Item saved" : "Item added",
      (r) => r.ok && onClose(),
    );
  }

  function remove() {
    if (!item || !window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    run(() => deleteItem(item.id), "Item deleted", (r) => r.ok && onClose());
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={item ? "Edit item" : "New item"}
      footer={
        <>
          {item && (
            <Button variant="danger" onClick={remove} disabled={pending}>
              Delete
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim() || !categoryId || !priceCheck.ok}>
              {item ? "Save" : "Add item"}
            </Button>
          </div>
        </>
      }
    >
      <Field label="Name *" htmlFor="item-name">
        <input id="item-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Margherita pizza" maxLength={80} autoFocus={!item} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field label="Category *" htmlFor="item-category">
          <select id="item-category" className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Price (${data.restaurant.currency})`} htmlFor="item-price">
          <input
            id="item-price"
            className={cx(inputClass, !priceCheck.ok && "border-red-400")}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="12.50"
          />
          {!priceCheck.ok && <p className="text-xs text-red-600">{priceCheck.error}</p>}
        </Field>
      </div>

      <Field label="Description" htmlFor="item-desc">
        <textarea
          id="item-desc"
          className={cx(inputClass, "min-h-20")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="San Marzano tomato, fresh mozzarella, basil"
          maxLength={500}
        />
      </Field>

      <Field label="Photo">
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 16l-5-5-9 9" />
            </svg>
          </span>
          Photo upload is coming soon.
        </div>
      </Field>

      <Field label="Dietary" hint="Guests can filter the menu by these.">
        <div className="flex flex-wrap gap-2">
          {DIETARY_TAGS.map((tag) => (
            <Chip key={tag} active={tags.includes(tag)} onClick={() => setTags((t) => toggleIn(t, tag))}>
              {DIETARY_LABEL[tag]}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Allergens" hint={data.allergens.length ? undefined : "Add allergens in the Allergens tab first."}>
        {data.allergens.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.allergens.map((a, i) => (
              <Chip key={a.id} active={allergenIds.includes(a.id)} onClick={() => setAllergenIds((x) => toggleIn(x, a.id))}>
                <span className="font-mono text-xs">{allergenCode(i)}</span> {a.name}
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <Field label="Extras" hint={data.extras.length ? "Optional add-ons guests can ask for." : "Add extras in the Extra tab first."}>
        {data.extras.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.extras.map((x) => (
              <Chip key={x.id} active={extraIds.includes(x.id)} onClick={() => setExtraIds((ids) => toggleIn(ids, x.id))}>
                {x.name} <span className="text-neutral-500">+{formatPrice(x.priceCents, data.restaurant.currency)}</span>
              </Chip>
            ))}
          </div>
        )}
      </Field>

      <div className="space-y-3 rounded-2xl bg-neutral-50 p-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">Sold out</span>
            <span className="block text-neutral-500">Still shown, marked as sold out.</span>
          </span>
          <Toggle checked={isSoldOut} onChange={setIsSoldOut} label="Sold out" tone="amber" />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">Show on menu</span>
            <span className="block text-neutral-500">Turn off to hide it from guests.</span>
          </span>
          <Toggle checked={isVisible} onChange={setIsVisible} label="Show on menu" />
        </label>
      </div>
    </Dialog>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "rounded-full border px-3 py-1.5 text-sm",
        active ? "border-brand bg-brand-soft text-brand" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}
