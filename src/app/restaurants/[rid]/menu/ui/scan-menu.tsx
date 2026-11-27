"use client";

import { useParams } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button, Dialog, cx, inputClass, useToast } from "@/components/ui";
import { compareDish, currentIndex, priceWarning, removedDishes, type DishChange, type PricedDish } from "@/lib/menu/compare";
import { centsToInput, parsePriceInput } from "@/lib/menu/format";
import { resizeImage } from "@/lib/resize-image";
import { restaurantPath } from "@/lib/restaurant-path";
import { MAX_MENU_FILE_MB, isPdfFile, putFile } from "@/lib/upload-client";
import { importMenu } from "../actions";
import { startMenuUpload } from "../upload-actions";

// "Upload menu": chọn file PDF hoặc ảnh menu giấy → AI đọc ra danh mục, món, giá
// → nhân viên XEM LẠI, sửa, bỏ món sai → bấm thêm. Không có gì được lưu trước khi bấm đồng ý.

type DraftVariant = { name: string; price: string };
type DraftItem = { key: string; include: boolean; name: string; description: string; price: string; variants: DraftVariant[] };
type DraftCategory = { key: string; include: boolean; name: string; items: DraftItem[] };
export type ReadResult = { categories: { name: string; items: { name: string; description: string | null; priceCents: number | null; variants: { name: string; priceCents: number }[] }[] }[] };

const MAX_PHOTOS = 4;
let keySeq = 0;
const nextKey = () => `k${keySeq++}`;

function toDraft(result: ReadResult, into: DraftCategory[]): DraftCategory[] {
  const out = into.map((c) => ({ ...c, items: [...c.items] }));
  for (const c of result.categories) {
    const items: DraftItem[] = c.items.map((it) => ({
      key: nextKey(),
      include: true,
      name: it.name,
      description: it.description ?? "",
      price: centsToInput(it.priceCents),
      variants: it.variants.map((v) => ({ name: v.name, price: centsToInput(v.priceCents) })),
    }));
    // Nhiều ảnh (nhiều trang menu) cùng tên danh mục thì gộp lại
    const same = out.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase());
    if (same) same.items.push(...items);
    else out.push({ key: nextKey(), include: true, name: c.name, items });
  }
  return out;
}

const priceOk = (p: string) => parsePriceInput(p).ok;
const cents = (p: string) => {
  const r = parsePriceInput(p);
  return r.ok ? r.cents : null;
};
const asDish = (it: DraftItem): PricedDish => ({
  name: it.name,
  priceCents: cents(it.price),
  // cỡ chưa nhập giá đã bị tô đỏ (ô lỗi); ở đây chỉ cần nhận ra giá $0
  variants: it.variants.map((v) => ({ name: v.name, priceCents: cents(v.price) ?? -1 })),
});

const CHANGE_CHIP: Record<DishChange["kind"], string> = {
  new: "bg-green-50 text-green-700",
  price: "bg-blue-50 text-blue-700",
  same: "bg-neutral-100 text-neutral-500",
};

/** Món đang có trong menu (để so sánh khi duyệt). */
export type CurrentMenu = { categories: string[]; dishes: PricedDish[]; currency: string };

export function ScanMenuButton({ current, variant = "secondary" }: { current: CurrentMenu; variant?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} className="gap-2 px-5 py-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        Upload menu
      </Button>
      {open && <ScanMenuDialog current={current} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Một file ở trang Bulk upload đã được AI đọc xong: mở thẳng bước xem lại. */
export type ReadyJob = { id: string; fileName: string; result: ReadResult };

export function ScanMenuDialog({
  current,
  job,
  onClose,
  onSaved,
}: {
  current: CurrentMenu;
  job?: ReadyJob;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const inputId = useId();
  const abort = useRef<AbortController | null>(null);
  const { rid } = useParams<{ rid: string }>();
  const [step, setStep] = useState<"pick" | "reading" | "review">(job ? "review" : "pick");
  // Menu đang có món: chọn thêm vào hay thay cả menu (bản cũ được lưu ở tab History)
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCategory[]>(() => (job ? toDraft(job.result, []) : []));
  const [saving, setSaving] = useState(false);
  const existing = new Set(current.categories.map((n) => n.trim().toLowerCase()));
  const dishCount = current.dishes.length;
  const [changesOnly, setChangesOnly] = useState(false);

  function close() {
    abort.current?.abort();
    onClose();
  }

  async function read(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS);
    if (files.length > MAX_PHOTOS) toast(`Reading the first ${MAX_PHOTOS} files`, "error");
    abort.current = new AbortController();
    setError(null);
    setStep("reading");
    setProgress({ done: 0, total: list.length });
    let acc: DraftCategory[] = [];
    const problems: string[] = [];
    for (const [i, file] of list.entries()) {
      try {
        let res: Response;
        if (isPdfFile(file)) {
          // PDF: tải thẳng lên kho (tới 20 MB), rồi nhờ máy chủ đọc file đó
          if (file.size > MAX_MENU_FILE_MB * 1024 * 1024) throw new Error(`The PDF is over ${MAX_MENU_FILE_MB} MB. Save it smaller, or upload photos of the pages.`);
          const t = await startMenuUpload({ mime: "application/pdf", size: file.size });
          if (!t.ok) throw new Error(t.error);
          await putFile(t.ticket.url, t.ticket.headers, file, undefined, abort.current.signal);
          res = await fetch(`${restaurantPath(rid, "menu")}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: t.ticket.key, mime: "application/pdf" }),
            signal: abort.current.signal,
          });
        } else {
          // Ảnh: thu nhỏ nhưng giữ đủ nét để đọc chữ trên menu
          const form = new FormData();
          form.set("photo", await resizeImage(file, { maxEdge: 2400 }), "menu.jpg");
          res = await fetch(`${restaurantPath(rid, "menu")}/read`, { method: "POST", body: form, signal: abort.current.signal });
        }
        const json = await res.json().catch(() => ({ error: "Something went wrong. Please try again." }));
        if (!res.ok) problems.push(list.length > 1 ? `File ${i + 1}: ${json.error}` : json.error);
        else acc = toDraft(json as ReadResult, acc);
      } catch (e) {
        if (abort.current.signal.aborted) return;
        problems.push(list.length > 1 ? `File ${i + 1}: ${e instanceof Error ? e.message : "Something went wrong"}` : e instanceof Error ? e.message : "Something went wrong");
      }
      setProgress({ done: i + 1, total: list.length });
    }
    if (acc.length === 0) {
      setError(problems[0] ?? "No dish could be read. Try a clearer PDF or a sharper photo.");
      setStep("pick");
      return;
    }
    if (problems.length) toast(problems.join(" "), "error");
    setDraft(acc);
    setStep("review");
  }

  const editCat = (ck: string, patch: Partial<DraftCategory>) => setDraft((d) => d.map((c) => (c.key === ck ? { ...c, ...patch } : c)));
  const editItem = (ck: string, ik: string, patch: Partial<DraftItem>) =>
    setDraft((d) => d.map((c) => (c.key === ck ? { ...c, items: c.items.map((it) => (it.key === ik ? { ...it, ...patch } : it)) } : c)));

  const chosen = draft.filter((c) => c.include).flatMap((c) => c.items.filter((it) => it.include).map((it) => ({ c, it })));
  const invalid = chosen.some(({ c, it }) => !c.name.trim() || !it.name.trim() || !priceOk(it.price) || it.variants.some((v) => !v.name.trim() || !priceOk(v.price) || cents(v.price) === null));

  // So sánh với menu đang có + nhắc giá (chỉ tính món đang được chọn)
  const index = currentIndex(current.dishes);
  const changeOf = (it: DraftItem) => compareDish(asDish(it), index, current.currency);
  const counts = { new: 0, price: 0, same: 0 };
  let warnings = 0;
  for (const { it } of chosen) {
    counts[changeOf(it).kind]++;
    if (priceWarning(asDish(it))) warnings++;
  }
  const removed = mode === "replace" ? removedDishes(current.dishes, chosen.map(({ it }) => it)) : [];

  async function save() {
    setSaving(true);
    const payload = {
      mode,
      jobId: job?.id,
      categories: draft
        .filter((c) => c.include)
        .map((c) => ({
          name: c.name.trim(),
          items: c.items
            .filter((it) => it.include)
            .map((it) => ({
              name: it.name.trim(),
              description: it.description.trim() || null,
              priceCents: cents(it.price),
              variants: it.variants.map((v) => ({ name: v.name.trim(), priceCents: cents(v.price) ?? 0 })),
            })),
        }))
        .filter((c) => c.items.length > 0),
    };
    const r = await importMenu(payload).catch(() => ({ ok: false as const, error: "Could not save. Check your connection and try again." }));
    setSaving(false);
    if (!r.ok) {
      toast(r.error, "error");
      return;
    }
    toast(
      mode === "replace"
        ? `Menu replaced: ${r.added} ${r.added === 1 ? "dish" : "dishes"}. The old menu is in History.`
        : `Added ${r.added} ${r.added === 1 ? "dish" : "dishes"}${r.newCategories ? ` and ${r.newCategories} new ${r.newCategories === 1 ? "category" : "categories"}` : ""}`,
    );
    onSaved?.();
    onClose();
  }

  return (
    <Dialog
      open
      size={step === "review" ? "lg" : "md"}
      onClose={close}
      title={step === "review" ? "Check the dishes before adding" : "Upload menu"}
      footer={
        step === "review" ? (
          <>
            {!job && (
              <Button variant="secondary" onClick={() => (setStep("pick"), setDraft([]))} disabled={saving} className="whitespace-nowrap">
                Rescan
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || chosen.length === 0 || invalid}>
                {saving ? "Saving…" : mode === "replace" ? `Replace menu with ${chosen.length} ${chosen.length === 1 ? "dish" : "dishes"}` : `Add ${chosen.length} ${chosen.length === 1 ? "dish" : "dishes"}`}
              </Button>
            </div>
          </>
        ) : undefined
      }
    >
      {step === "pick" && (
        <div className="space-y-4">
          <p className="text-neutral-700">Upload the menu PDF, or photos of the paper menu. We read the dishes and prices, then you check everything before it’s added.</p>
          <ul className="space-y-1.5 text-sm text-neutral-600">
            <li>• A PDF can have many pages (up to {MAX_MENU_FILE_MB} MB). Reading a long PDF takes up to a few minutes.</li>
            <li>• Photos: lay the menu flat, in good light, and fill the photo with it.</li>
            <li>• Choose up to {MAX_PHOTOS} files at once. Nothing is added until you approve it.</li>
          </ul>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-6 py-10 text-center hover:border-brand">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-brand" aria-hidden>
              <path d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="font-semibold">Choose a PDF or photos</span>
            <span className="text-sm text-neutral-500">PDF, JPG, PNG or WebP · up to {MAX_PHOTOS} files</span>
          </label>
          <input id={inputId} type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/*" multiple className="sr-only" aria-label="Menu files" onChange={(e) => read(e.target.files)} />
        </div>
      )}

      {step === "reading" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center" role="status">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand" aria-hidden />
          <p className="font-semibold">
            Reading your menu{progress.total > 1 ? ` (file ${Math.min(progress.done + 1, progress.total)} of ${progress.total})` : ""}…
          </p>
          <p className="text-sm text-neutral-500">This can take up to 30 seconds per photo, and up to a minute for a long PDF.</p>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-5">
          {job && <p className="text-sm font-medium text-neutral-800">From {job.fileName}</p>}
          {dishCount > 0 && (
            <fieldset className="rounded-2xl bg-neutral-50 p-3">
              <legend className="sr-only">How to save</legend>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <label className="flex items-start gap-2 text-sm">
                  <input type="radio" name="import-mode" checked={mode === "add"} onChange={() => setMode("add")} className="mt-0.5 accent-brand" />
                  <span>
                    <b>Add to the current menu</b>
                    <span className="block text-neutral-500">Keeps the {dishCount} dishes already there.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="radio" name="import-mode" checked={mode === "replace"} onChange={() => setMode("replace")} className="mt-0.5 accent-brand" />
                  <span>
                    <b>Replace the whole menu</b>
                    <span className="block text-neutral-500">For a new menu. Dishes with the same name keep their photo and stats. The old menu is saved in History.</span>
                  </span>
                </label>
              </div>
            </fieldset>
          )}
          {(dishCount > 0 || warnings > 0) && (
            <div className="space-y-2 rounded-2xl border border-neutral-200 p-3 text-sm" aria-label="Changes" role="region">
              {dishCount > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p>
                    Compared with the current menu: <b className="text-green-700">{counts.new} new</b> ·{" "}
                    <b className="text-blue-700">
                      {counts.price} price {counts.price === 1 ? "change" : "changes"}
                    </b>{" "}
                    · <span className="text-neutral-500">{counts.same} no change</span>
                  </p>
                  <label className="ml-auto flex items-center gap-2">
                    <input type="checkbox" checked={changesOnly} onChange={(e) => setChangesOnly(e.target.checked)} className="h-4 w-4 accent-brand" />
                    Show changes only
                  </label>
                </div>
              )}
              {warnings > 0 && (
                <p className="font-medium text-amber-800">
                  {warnings} {warnings === 1 ? "dish" : "dishes"} to check: no price or $0. Fix the price, or leave it empty for dishes without a price.
                </p>
              )}
              {mode === "replace" && removed.length > 0 && (
                <details className="text-red-700">
                  <summary className="font-medium">
                    Will be removed: {removed.length} {removed.length === 1 ? "dish" : "dishes"} not in the new menu
                  </summary>
                  <p className="mt-1">{removed.map((d) => d.name).join(", ")}</p>
                </details>
              )}
            </div>
          )}
          <p className="text-sm text-neutral-600">
            We read {draft.reduce((n, c) => n + c.items.length, 0)} dishes in {draft.length} {draft.length === 1 ? "category" : "categories"}. Please check names and prices against your menu,
            fix anything that’s off, and untick dishes you don’t want.
          </p>
          {draft.map((c) => {
            const merge = existing.has(c.name.trim().toLowerCase());
            return (
              <section key={c.key} className={cx("rounded-2xl border border-neutral-200", !c.include && "opacity-50")} aria-label={`Category ${c.name}`}>
                <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
                  <input type="checkbox" checked={c.include} onChange={(e) => editCat(c.key, { include: e.target.checked })} aria-label={`Add category ${c.name}`} className="h-4 w-4 accent-brand" />
                  <input aria-label="Category name" className={cx(inputClass, "font-semibold", !c.name.trim() && "border-red-400")} value={c.name} onChange={(e) => editCat(c.key, { name: e.target.value })} maxLength={60} />
                  <span className="shrink-0 text-xs text-neutral-500">{mode === "replace" ? "" : merge ? "Adds to your existing category" : "New category"}</span>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {c.items.map((it) => {
                    const change = dishCount > 0 ? changeOf(it) : null;
                    const warn = it.include ? priceWarning(asDish(it)) : null;
                    if (changesOnly && change?.kind === "same" && !warn) return null;
                    return (
                      <li key={it.key} className={cx("flex gap-3 px-4 py-3", !it.include && "opacity-50", warn && "bg-amber-50")}>
                        <input type="checkbox" checked={it.include} onChange={(e) => editItem(c.key, it.key, { include: e.target.checked })} aria-label={`Add ${it.name}`} className="mt-3 h-4 w-4 accent-brand" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input aria-label="Dish name" className={cx(inputClass, "min-w-0 flex-1", !it.name.trim() && "border-red-400")} value={it.name} onChange={(e) => editItem(c.key, it.key, { name: e.target.value })} maxLength={120} />
                            {it.variants.length === 0 && (
                              <div className="relative w-28 shrink-0">
                                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">$</span>
                                <input
                                  aria-label={`Price of ${it.name}`}
                                  className={cx(inputClass, "pl-7 text-right tabular-nums", !priceOk(it.price) && "border-red-400")}
                                  value={it.price}
                                  onChange={(e) => editItem(c.key, it.key, { price: e.target.value })}
                                  inputMode="decimal"
                                  placeholder="No price"
                                />
                              </div>
                            )}
                          </div>
                          {it.variants.length > 0 && (
                            <div className="flex flex-wrap gap-2" aria-label={`Sizes of ${it.name}`}>
                              {it.variants.map((v, vi) => (
                                <span key={vi} className="flex items-center gap-1 rounded-xl bg-neutral-50 p-1">
                                  <input
                                    aria-label={`Size ${vi + 1} of ${it.name}`}
                                    className="w-24 rounded-lg border border-neutral-200 px-2 py-1 text-sm"
                                    value={v.name}
                                    onChange={(e) => editItem(c.key, it.key, { variants: it.variants.map((x, j) => (j === vi ? { ...x, name: e.target.value } : x)) })}
                                  />
                                  <input
                                    aria-label={`Price of ${it.name} ${v.name}`}
                                    className={cx("w-20 rounded-lg border border-neutral-200 px-2 py-1 text-right text-sm tabular-nums", (!priceOk(v.price) || cents(v.price) === null) && "border-red-400")}
                                    value={v.price}
                                    onChange={(e) => editItem(c.key, it.key, { variants: it.variants.map((x, j) => (j === vi ? { ...x, price: e.target.value } : x)) })}
                                    inputMode="decimal"
                                  />
                                </span>
                              ))}
                            </div>
                          )}
                          <input
                            aria-label={`Description of ${it.name}`}
                            className={cx(inputClass, "text-sm")}
                            value={it.description}
                            onChange={(e) => editItem(c.key, it.key, { description: e.target.value })}
                            placeholder="Description (optional)"
                            maxLength={500}
                          />
                          {(change || warn) && (
                            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                              {change && (
                                <span className={cx("rounded-full px-2 py-0.5", CHANGE_CHIP[change.kind])}>
                                  {change.kind === "new" ? "New" : change.kind === "same" ? "No change" : `Price changed: ${change.from} → ${change.to}`}
                                </span>
                              )}
                              {warn && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">⚠ {warn}</span>}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {invalid && <p className="text-sm text-red-600">Fix the boxes marked in red: every dish needs a name, and prices look like 12 or 12.50.</p>}
          <p className="text-xs text-neutral-500">Photos, dietary tags and allergens can be added to each dish afterwards.</p>
        </div>
      )}
    </Dialog>
  );
}
