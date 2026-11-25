"use client";

import { useState } from "react";
import { ImageField } from "@/components/image-upload";
import { Button, Dialog, Field, Toggle, cx, inputClass, useToast } from "@/components/ui";
import { DIETARY_LABEL, DIETARY_TAGS, MAX_VARIANTS, allergenCode, centsToInput, formatPrice, parsePriceInput, type DietaryTagValue } from "@/lib/menu/format";
import type { MenuData, MenuItemRow } from "@/lib/menu/types";
import { uploadImage } from "../../media-actions";
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
  // Giá theo cỡ (Small/Large, Glass/Bottle…). Danh sách rỗng = một giá.
  const [sizes, setSizes] = useState<{ name: string; price: string }[]>(item?.variants.map((v) => ({ name: v.name, price: centsToInput(v.priceCents) })) ?? []);
  const hasSizes = sizes.length > 0;
  const sizeProblem = hasSizes
    ? sizes.length < 2
      ? "Add at least 2 sizes"
      : sizes.some((s) => !s.name.trim())
        ? "Each size needs a name"
        : sizes.some((s) => !s.price.trim() || !parsePriceInput(s.price).ok)
          ? "Each size needs a price like 4 or 4.50"
          : new Set(sizes.map((s) => s.name.trim().toLowerCase())).size !== sizes.length
            ? "Each size needs a different name"
            : null
    : null;
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? data.categories[0]?.id ?? "");
  const [tags, setTags] = useState<DietaryTagValue[]>(item?.dietaryTags ?? []);
  const [allergenIds, setAllergenIds] = useState<string[]>(item?.allergenIds ?? []);
  const [extraIds, setExtraIds] = useState<string[]>(item?.extraIds ?? []);
  const [isVisible, setIsVisible] = useState(item?.isVisible ?? true);
  const [isSoldOut, setIsSoldOut] = useState(item?.isSoldOut ?? false);
  const [isFeatured, setIsFeatured] = useState(item?.isFeatured ?? false);
  const [newPhoto, setNewPhoto] = useState<Blob | null>(null); // món mới: gửi ảnh sau khi lưu món
  const { run, pending } = useSave();
  const toast = useToast();

  const priceCheck = parsePriceInput(price);

  function toggleIn<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  function submit() {
    run(
      () =>
        saveItem({ id: item?.id, categoryId, name, description, price: hasSizes ? null : price, variants: sizes, dietaryTags: tags, allergenIds, extraIds, isVisible, isSoldOut, isFeatured }),
      item ? "Item saved" : "Item added",
      async (r) => {
        if (!r.ok) return;
        if (!item && newPhoto && r.id) {
          const form = new FormData();
          form.set("target", "item");
          form.set("itemId", r.id);
          form.set("file", newPhoto, "photo.jpg");
          const up = await uploadImage(form).catch(() => ({ ok: false as const, error: "Photo upload failed. Open the item to try again." }));
          if (!up.ok) toast(up.error, "error");
        }
        onClose();
      },
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
            <Button onClick={submit} disabled={pending || !name.trim() || !categoryId || (hasSizes ? Boolean(sizeProblem) : !priceCheck.ok)}>
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
        {hasSizes ? (
          <Field label={`Price (${data.restaurant.currency})`}>
            <p className="rounded-xl bg-neutral-100 px-3 py-2.5 text-sm text-neutral-600">Set per size below</p>
          </Field>
        ) : (
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
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <span>
            <span className="font-medium">Sizes</span>
            <span className="block text-sm text-neutral-500">Different prices for Small / Large, Glass / Bottle, 6 / 12 wings…</span>
          </span>
          <Toggle
            checked={hasSizes}
            onChange={(on) =>
              setSizes(
                on
                  ? [
                      { name: "", price: price },
                      { name: "", price: "" },
                    ]
                  : [],
              )
            }
            label="Has sizes"
          />
        </div>
        {hasSizes && (
          <div className="mt-4 space-y-2">
            {sizes.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  aria-label={`Size ${i + 1} name`}
                  className={cx(inputClass, "min-w-0 flex-1")}
                  value={s.name}
                  onChange={(e) => setSizes((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder={["Small", "Large", "Glass", "Bottle", "6 pieces", "12 pieces"][i] ?? "Size"}
                  maxLength={30}
                />
                <div className="relative w-28 shrink-0">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">{data.restaurant.currency === "USD" ? "$" : ""}</span>
                  <input
                    aria-label={`Size ${i + 1} price`}
                    className={cx(inputClass, "pl-7 text-right tabular-nums", s.price.trim() !== "" && !parsePriceInput(s.price).ok && "border-red-400")}
                    value={s.price}
                    onChange={(e) => setSizes((all) => all.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remove size ${i + 1}`}
                  onClick={() => setSizes((all) => all.filter((_, j) => j !== i))}
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 pt-1">
              {sizes.length < MAX_VARIANTS ? (
                <button type="button" className="text-sm font-semibold text-brand" onClick={() => setSizes((all) => [...all, { name: "", price: "" }])}>
                  + Add size
                </button>
              ) : (
                <span className="text-sm text-neutral-500">Up to {MAX_VARIANTS} sizes</span>
              )}
              {sizeProblem && <p className="text-xs text-red-600">{sizeProblem}</p>}
            </div>
          </div>
        )}
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

      <ImageField
        target="item"
        itemId={item?.id}
        url={item?.imageUrl ?? null}
        label="Photo"
        hint={item ? "Square photos look best." : "Saved together with the item."}
        onPick={setNewPhoto}
      />

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
            <span className="font-medium">Chef&apos;s pick</span>
            <span className="block text-neutral-500">Featured at the top of your page (needs a photo).</span>
          </span>
          <Toggle checked={isFeatured} onChange={setIsFeatured} label="Chef's pick" />
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
