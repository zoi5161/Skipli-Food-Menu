"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, cx, useToast } from "@/components/ui";
import { DIETARY_LABEL } from "@/lib/menu/format";
import { applyMenuTags, suggestMenuTags, type TagRow } from "../tag-actions";

// "Suggest tags with AI": AI đọc tên + mô tả món, gợi ý nhãn (Vegetarian, Spicy…) và chất gây dị ứng.
// Tất cả gợi ý được tick sẵn; nhân viên bỏ tick cái sai rồi bấm Apply. Không có gì được lưu trước đó.

export function SuggestTagsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="gap-2 px-5 py-2.5">
        <span aria-hidden>✨</span>
        Suggest tags with AI
      </Button>
      {open && <SuggestTagsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

// Một gợi ý = một nhãn hoặc một chất gây dị ứng của một món
const key = (itemId: string, kind: "tag" | "allergen", value: string) => `${itemId}|${kind}|${value}`;

function SuggestTagsDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<TagRow[] | null>(null);
  const [dishes, setDishes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [off, setOff] = useState<Set<string>>(new Set()); // gợi ý bị bỏ tick
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    suggestMenuTags()
      .catch(() => ({ ok: false as const, error: "Could not reach the AI. Check your connection and try again." }))
      .then((r) => {
        if (!live) return;
        if (r.ok) {
          setRows(r.rows);
          setDishes(r.dishes);
        } else setError(r.error);
      });
    return () => {
      live = false;
    };
  }, []);

  const toggle = (k: string) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const chosen = (rows ?? [])
    .map((r) => ({ itemId: r.itemId, tags: r.tags.filter((t) => !off.has(key(r.itemId, "tag", t))), allergens: r.allergens.filter((a) => !off.has(key(r.itemId, "allergen", a))) }))
    .filter((c) => c.tags.length || c.allergens.length);
  const total = chosen.reduce((n, c) => n + c.tags.length + c.allergens.length, 0);

  async function apply() {
    setSaving(true);
    const r = await applyMenuTags(chosen).catch(() => ({ ok: false as const, error: "Could not save. Check your connection and try again." }));
    setSaving(false);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    toast(`Tags added to ${r.dishes} ${r.dishes === 1 ? "dish" : "dishes"}`);
    onClose();
  }

  const chip = (k: string, label: string, kind: "tag" | "allergen") => {
    const on = !off.has(k);
    return (
      <label
        key={k}
        className={cx(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
          on ? (kind === "tag" ? "border-green-300 bg-green-50 text-green-800" : "border-amber-300 bg-amber-50 text-amber-900") : "border-neutral-200 bg-white text-neutral-400 line-through",
        )}
      >
        <input type="checkbox" checked={on} onChange={() => toggle(k)} className="h-3.5 w-3.5 accent-brand" />
        {label}
      </label>
    );
  };

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title="Suggested tags"
      footer={
        rows && rows.length > 0 ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving} className="ml-auto">
              Cancel
            </Button>
            <Button onClick={apply} disabled={saving || total === 0}>
              {saving ? "Saving…" : `Apply ${total} ${total === 1 ? "tag" : "tags"}`}
            </Button>
          </>
        ) : undefined
      }
    >
      {!rows && !error && (
        <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-hidden />
          <p className="font-semibold">Reading your dishes…</p>
          <p className="text-sm text-neutral-500">The AI looks at each dish name and description. This takes a few seconds.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {rows && rows.length === 0 && <p className="py-6 text-center text-neutral-600">No new tags to suggest for your {dishes} dishes.</p>}
      {rows && rows.length > 0 && (
        <>
          <p className="text-sm text-neutral-600">
            Suggestions for {rows.length} of your {dishes} dishes, from their names and descriptions. Untick anything that’s wrong. <span className="text-green-700">Green</span> = dietary tag,{" "}
            <span className="text-amber-800">amber</span> = allergen. Tags already on a dish are kept.
          </p>
          <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200" aria-label="Suggestions">
            {rows.map((r) => (
              <li key={r.itemId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center" aria-label={r.name}>
                <div className="min-w-0 sm:w-56">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-neutral-500">{r.category}</p>
                </div>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {r.tags.map((t) => chip(key(r.itemId, "tag", t), DIETARY_LABEL[t], "tag"))}
                  {r.allergens.map((a) => chip(key(r.itemId, "allergen", a), a, "allergen"))}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-neutral-500">AI suggestions can be wrong. Allergen info shown to guests should be checked with the kitchen.</p>
        </>
      )}
    </Dialog>
  );
}
