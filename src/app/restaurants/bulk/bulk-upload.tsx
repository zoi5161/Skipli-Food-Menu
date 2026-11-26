"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/page-loading";
import { cx } from "@/components/ui";
import { restaurantPath } from "@/lib/restaurant-path";
import { bestRestaurant } from "@/lib/studio/match";
import { MAX_MENU_FILE_MB, isPdfFile, menuFileMime, putFile } from "@/lib/upload-client";
import { dismissJob, listJobs, queueMenuJob, retryJob, startBulkUpload, type JobRow } from "./actions";

// Bulk upload: chọn nhiều file menu, gắn mỗi file với một quán (gợi ý theo tên file), bấm tải lên.
// AI đọc phía sau trên máy chủ (đóng trang vẫn chạy); bảng bên dưới cập nhật trạng thái vài giây một lần.

type R = { id: string; name: string; place: string };
type Pending = { key: string; file: File; restaurantId: string; label: string; progress: number; state: "ready" | "uploading" | "done" | "error"; error?: string };

const label = (r: R) => (r.place ? `${r.name} — ${r.place}` : r.name);
const OK_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACTIVE = new Set(["QUEUED", "READING"]);

export function BulkUpload({ restaurants, initialJobs }: { restaurants: R[]; initialJobs: JobRow[] }) {
  const inputId = useId();
  const listId = useId();
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState(initialJobs);
  const byLabel = useMemo(() => new Map(restaurants.map((r) => [label(r).toLowerCase(), r])), [restaurants]);
  const seq = useRef(0);

  function add(files: FileList | null) {
    if (!files) return;
    const next: Pending[] = Array.from(files).map((file) => {
      const mime = menuFileMime(file);
      const match = bestRestaurant(file.name, restaurants);
      const tooBig = file.size > MAX_MENU_FILE_MB * 1024 * 1024;
      const badType = !OK_TYPES.includes(mime);
      return {
        key: `f${seq.current++}`,
        file,
        restaurantId: match?.id ?? "",
        label: match ? label(match) : "",
        progress: 0,
        state: tooBig || badType ? "error" : "ready",
        error: badType ? "Use a PDF, JPG, PNG or WebP file" : tooBig ? `Over ${MAX_MENU_FILE_MB} MB` : undefined,
      };
    });
    setPending((p) => [...p, ...next]);
  }

  const edit = (key: string, patch: Partial<Pending>) => setPending((p) => p.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const readyRows = pending.filter((p) => p.state === "ready");
  const missing = readyRows.filter((p) => !p.restaurantId).length;

  const refresh = useCallback(async () => {
    try {
      setJobs(await listJobs());
    } catch {
      // mạng chập chờn: lần sau thử lại
    }
  }, []);

  async function uploadAll() {
    setBusy(true);
    for (const p of readyRows) {
      edit(p.key, { state: "uploading", progress: 0 });
      try {
        const mime = menuFileMime(p.file);
        const t = await startBulkUpload({ restaurantId: p.restaurantId, mime, size: p.file.size });
        if (!t.ok) throw new Error(t.error);
        await putFile(t.ticket.url, t.ticket.headers, p.file, (f) => edit(p.key, { progress: f }));
        const q = await queueMenuJob({ restaurantId: p.restaurantId, key: t.ticket.key, fileName: p.file.name, size: p.file.size, mime });
        if (!q.ok) throw new Error(q.error);
        edit(p.key, { state: "done", progress: 1 });
      } catch (e) {
        edit(p.key, { state: "error", error: e instanceof Error ? e.message : "Upload failed" });
      }
    }
    setBusy(false);
    setPending((list) => list.filter((x) => x.state !== "done"));
    refresh();
  }

  // Còn file đang chờ / đang đọc thì 4 giây hỏi lại một lần
  const active = jobs.some((j) => ACTIVE.has(j.status));
  useEffect(() => {
    if (!active) return;
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [active, refresh]);

  const counts = {
    reading: jobs.filter((j) => ACTIVE.has(j.status)).length,
    ready: jobs.filter((j) => j.status === "READY").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Bulk upload</h1>
        <p className="mt-1 max-w-2xl text-neutral-600">
          Upload menu PDFs (or photos) for many restaurants at once. The AI reads them in the background, so you can close this page. Then open each one to review and add it to the menu.
        </p>
      </div>

      <section aria-label="Files to upload" className="space-y-3">
        <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-8 text-center hover:border-brand">
          <span className="font-semibold">Choose menu files</span>
          <span className="text-sm text-neutral-500">PDF, JPG, PNG or WebP · up to {MAX_MENU_FILE_MB} MB each · many at once</span>
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Menu files"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />

        {pending.length > 0 && (
          <>
            <datalist id={listId}>
              {restaurants.map((r) => (
                <option key={r.id} value={label(r)} />
              ))}
            </datalist>
            <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white">
              {pending.map((p) => (
                <li key={p.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 sm:w-64">
                    <p className="truncate font-medium" title={p.file.name}>
                      <span className="mr-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600">{isPdfFile(p.file) ? "PDF" : "PHOTO"}</span>
                      {p.file.name}
                    </p>
                    <p className="text-xs text-neutral-500">{(p.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      list={listId}
                      aria-label={`Restaurant for ${p.file.name}`}
                      placeholder="Type to find the restaurant"
                      value={p.label}
                      disabled={p.state !== "ready" && p.state !== "error"}
                      onChange={(e) => {
                        const r = byLabel.get(e.target.value.toLowerCase());
                        edit(p.key, { label: e.target.value, restaurantId: r?.id ?? "" });
                      }}
                      className={cx(
                        "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
                        p.state === "ready" && !p.restaurantId ? "border-amber-400" : "border-neutral-300",
                      )}
                    />
                    {p.state === "ready" && !p.restaurantId && <p className="mt-1 text-xs text-amber-700">Choose the restaurant from the list</p>}
                    {p.error && <p className="mt-1 text-xs text-red-600">{p.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 sm:w-40 sm:justify-end">
                    {p.state === "uploading" && (
                      <span className="flex items-center gap-2 text-sm text-neutral-600">
                        <Spinner className="h-4 w-4" />
                        {Math.round(p.progress * 100)}%
                      </span>
                    )}
                    {(p.state === "ready" || p.state === "error") && (
                      <button type="button" onClick={() => setPending((l) => l.filter((x) => x.key !== p.key))} className="text-sm font-medium text-neutral-500 hover:text-red-600" aria-label={`Remove ${p.file.name}`}>
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              {missing > 0 && <p className="text-sm text-amber-700">{missing} {missing === 1 ? "file needs" : "files need"} a restaurant.</p>}
              <button
                type="button"
                onClick={uploadAll}
                disabled={busy || readyRows.length === 0 || missing > 0}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {busy && <Spinner className="h-4 w-4" />}
                {busy ? "Uploading…" : `Upload and read ${readyRows.length} ${readyRows.length === 1 ? "file" : "files"}`}
              </button>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="jobs-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="jobs-title" className="text-lg font-semibold">
            Recent uploads
          </h2>
          <p className="text-sm text-neutral-500" aria-live="polite">
            {counts.reading} reading · {counts.ready} ready to review · {counts.failed} failed
          </p>
        </div>
        {jobs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-neutral-600">No uploads yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label="Uploads">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{j.restaurantName}</p>
                  <p className="truncate text-sm text-neutral-500" title={j.fileName}>
                    {j.fileName}
                  </p>
                  {j.status === "FAILED" && j.error && <p className="text-sm text-red-600">{j.error}</p>}
                </div>
                <StatusChip job={j} />
                <div className="flex items-center gap-2">
                  {j.status === "READY" && (
                    <Link href={restaurantPath(j.restaurantId, "menu", { review: j.id })} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
                      Review
                    </Link>
                  )}
                  {j.status === "APPLIED" && (
                    <Link href={restaurantPath(j.restaurantId)} className="text-sm font-semibold text-brand">
                      Open restaurant
                    </Link>
                  )}
                  {j.status === "FAILED" && (
                    <button type="button" onClick={() => retryJob(j.id).then(refresh)} className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-semibold hover:bg-neutral-50">
                      Try again
                    </button>
                  )}
                  {(j.status === "READY" || j.status === "FAILED") && (
                    <button type="button" onClick={() => dismissJob(j.id).then(refresh)} className="text-sm font-medium text-neutral-500 hover:text-red-600" aria-label={`Dismiss ${j.fileName}`}>
                      Dismiss
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusChip({ job }: { job: JobRow }) {
  const map: Record<JobRow["status"], [string, string]> = {
    QUEUED: ["Waiting", "bg-neutral-100 text-neutral-700"],
    READING: ["Reading…", "bg-blue-50 text-blue-700"],
    READY: [`Ready to review · ${job.dishes} dishes`, "bg-amber-50 text-amber-800"],
    FAILED: ["Failed", "bg-red-50 text-red-700"],
    APPLIED: [`Added · ${job.dishes} dishes`, "bg-green-50 text-green-700"],
    DISMISSED: ["Dismissed", "bg-neutral-100 text-neutral-500"],
  };
  const [text, cls] = map[job.status];
  return (
    <span className={cx("inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap", cls)} data-testid="job-status">
      {ACTIVE.has(job.status) && <Spinner className="h-3 w-3" />}
      {text}
    </span>
  );
}
