"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, Dialog, useToast } from "@/components/ui";
import { formatPrice, priceDisplay } from "@/lib/menu/format";
import type { MenuDoc } from "@/lib/menu/history";
import { getSnapshot, restoreSnapshot } from "../history-actions";

// Tab History: các bản menu cũ (lưu tự động trước khi thêm món từ file, thay cả menu hoặc khôi phục).
// Xem trước một bản, bấm "Restore" để đưa menu về bản đó (menu hiện tại cũng được lưu lại trước).

export type SnapshotRow = { id: string; when: string; note: string | null; itemCount: number; categoryCount: number; by: string | null };

export function HistoryTab({ rows, currency }: { rows: SnapshotRow[]; currency: string }) {
  const [open, setOpen] = useState<SnapshotRow | null>(null);
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-600">
        <p className="text-lg font-semibold text-neutral-900">No saved versions yet</p>
        <p className="mx-auto mt-1 max-w-md">Every time you add dishes from a file, replace the menu or restore a version, the menu before the change is saved here.</p>
      </div>
    );
  }
  return (
    <>
      <p className="text-sm text-neutral-600">Saved automatically before each upload, replace or restore. The latest {rows.length} versions are kept.</p>
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label="Saved versions">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.when}</p>
              <p className="text-sm text-neutral-500">
                {r.itemCount} {r.itemCount === 1 ? "dish" : "dishes"} in {r.categoryCount} {r.categoryCount === 1 ? "category" : "categories"}
                {r.note ? ` · ${r.note}` : ""}
                {r.by ? ` · ${r.by}` : ""}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setOpen(r)} aria-label={`View version from ${r.when}`}>
              View
            </Button>
          </li>
        ))}
      </ul>
      {open && <SnapshotDialog row={open} currency={currency} onClose={() => setOpen(null)} />}
    </>
  );
}

function SnapshotDialog({ row, currency, onClose }: { row: SnapshotRow; currency: string; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [doc, setDoc] = useState<MenuDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, startRestore] = useTransition();
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    let live = true;
    getSnapshot(row.id)
      .catch(() => ({ ok: false as const, error: "Could not load this version. Check your connection." }))
      .then((r) => {
        if (!live) return;
        if (r.ok) setDoc(r.doc);
        else setError(r.error);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [row.id]);

  function restore() {
    startRestore(async () => {
      const r = await restoreSnapshot(row.id).catch(() => ({ ok: false as const, error: "Could not restore. Check your connection and try again." }));
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast(`Menu restored (${r.items} ${r.items === 1 ? "dish" : "dishes"})`);
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={`Version from ${row.when}`}
      footer={
        confirm ? (
          <div className="flex w-full flex-wrap items-center gap-2" role="alertdialog" aria-label="Restore this version?">
            <p className="flex-1 text-sm text-amber-900">The menu will become exactly this version. Today’s menu is saved in History first.</p>
            <Button variant="secondary" onClick={() => setConfirm(false)} disabled={restoring}>
              Cancel
            </Button>
            <Button onClick={restore} disabled={restoring}>
              {restoring ? "Restoring…" : "Yes, restore"}
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} className="ml-auto">
              Close
            </Button>
            <Button onClick={() => setConfirm(true)} disabled={!doc}>
              Restore this version
            </Button>
          </>
        )
      }
    >
      {loading && <p className="text-neutral-500">Loading…</p>}
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {doc?.categories.map((c) => (
        <section key={c.name} aria-label={`Category ${c.name}`}>
          <h3 className="font-semibold">
            {c.name}
            {c.isVisible === false && <span className="ml-2 text-xs font-normal text-neutral-500">(hidden)</span>}
          </h3>
          <ul className="mt-1 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {c.items.map((it, i) => {
              const d = priceDisplay(it.priceCents, it.variants.length >= 2 ? it.variants : [], currency);
              const price = !d ? "" : d.kind === "sizes" ? d.parts.map((p) => `${p.name} ${p.price}`).join(" · ") : d.kind === "from" ? d.text : formatPrice(it.priceCents, currency);
              return (
                <li key={`${it.name}-${i}`} className="flex gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    {it.name}
                    {it.isSoldOut && <span className="ml-1 text-xs text-red-600">(sold out)</span>}
                  </span>
                  <span className="text-neutral-600 tabular-nums">{price}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Dialog>
  );
}
