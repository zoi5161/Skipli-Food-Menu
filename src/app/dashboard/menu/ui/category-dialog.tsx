"use client";

import { useState } from "react";
import { Button, Dialog, Field, cx, inputClass } from "@/components/ui";
import { WEEK_ORDER, dayShort, formatServingTimes } from "@/lib/menu/format";
import type { MenuCategory } from "@/lib/menu/types";
import { deleteCategory, saveCategory } from "../actions";
import { useSave } from "./shared";

/** Thêm hoặc sửa danh mục, kể cả giờ phục vụ. */
export function CategoryDialog({
  category,
  itemCount = 0,
  onClose,
}: {
  category: MenuCategory | null; // null = thêm mới
  itemCount?: number;
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const hasTimes = Boolean(category && (category.servingDays.length > 0 || category.servingFrom));
  const [mode, setMode] = useState<"always" | "times">(hasTimes ? "times" : "always");
  const [days, setDays] = useState<number[]>(category?.servingDays.length ? category.servingDays : [1, 2, 3, 4, 5, 6, 0]);
  const [from, setFrom] = useState(category?.servingFrom ?? "");
  const [until, setUntil] = useState(category?.servingUntil ?? "");
  const { run, pending } = useSave();

  const allDays = days.length === 7;
  const preview = mode === "times" ? formatServingTimes(allDays ? [] : days, from || null, until || null) : "";

  function toggleDay(day: number) {
    setDays((d) => (d.includes(day) ? d.filter((x) => x !== day) : [...d, day]));
  }

  function submit() {
    run(
      () =>
        saveCategory({
          id: category?.id,
          name,
          description,
          // "Mọi ngày" lưu là danh sách trống
          servingDays: mode === "times" && !allDays ? days : [],
          servingFrom: mode === "times" && from ? from : null,
          servingUntil: mode === "times" && until ? until : null,
        }),
      category ? "Category saved" : "Category added",
      (r) => r.ok && onClose(),
    );
  }

  function remove() {
    if (!category) return;
    const warning =
      itemCount > 0
        ? `Delete "${category.name}" and its ${itemCount} item${itemCount === 1 ? "" : "s"}? This can't be undone.`
        : `Delete "${category.name}"?`;
    if (!window.confirm(warning)) return;
    run(() => deleteCategory(category.id), "Category deleted", (r) => r.ok && onClose());
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          {category && (
            <Button variant="danger" onClick={remove} disabled={pending}>
              Delete
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim() || (mode === "times" && days.length === 0)}>
              {category ? "Save" : "Add category"}
            </Button>
          </div>
        </>
      }
    >
      <Field label="Name *" htmlFor="cat-name">
        <input id="cat-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Starters" maxLength={60} autoFocus />
      </Field>
      <Field label="Description" htmlFor="cat-desc">
        <textarea
          id="cat-desc"
          className={cx(inputClass, "min-h-20")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional, shown under the category name"
          maxLength={300}
        />
      </Field>

      <Field label="Serving times">
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-300">
          {(["always", "times"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cx("py-2.5 text-sm font-medium", mode === m ? "bg-neutral-900 text-white" : "bg-white text-neutral-700")}
            >
              {m === "always" ? "Always" : "Set times"}
            </button>
          ))}
        </div>
        {mode === "always" ? (
          <p className="text-xs text-neutral-500">Served whenever you&apos;re open. Example: set breakfast to 7:00–11:00.</p>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_ORDER.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={days.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={cx(
                    "rounded-lg border py-2 text-xs font-semibold sm:text-sm",
                    days.includes(day) ? "border-brand bg-brand-soft text-brand" : "border-neutral-300 text-neutral-500",
                  )}
                >
                  {dayShort(day)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 text-sm text-neutral-600">
                From
                <input type="time" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="space-y-1 text-sm text-neutral-600">
                Until
                <input type="time" className={inputClass} value={until} onChange={(e) => setUntil(e.target.value)} />
              </label>
            </div>
            <p className="text-xs text-neutral-500">
              Your menu page always shows this category, with the times next to it. Leave the hours empty for all day.
              {preview && (
                <>
                  {" "}
                  Guests will see: <strong className="text-neutral-800">{preview}</strong>
                </>
              )}
            </p>
            {days.length === 0 && <p className="text-xs text-red-600">Pick at least one day.</p>}
          </div>
        )}
      </Field>
    </Dialog>
  );
}
