"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Spinner } from "@/components/page-loading";
import { readRestaurantCsv, type CsvResult } from "@/lib/studio/restaurant-csv";
import { US_TIME_ZONES } from "@/lib/timezones";
import { importRestaurants, type ImportResult } from "../actions";

// Nhập nhiều nhà hàng từ file CSV (Excel / Google Sheets → File → Download → CSV).
// Bước 1: chọn file → xem trước từng dòng (dòng lỗi tô đỏ, không nhập). Bước 2: bấm Import.

const SAMPLE = [
  "name,address,city,state,zip,phone,website,email,timezone",
  "Sunny Side Pizzeria,10 Oak Ave,Austin,TX,78701,(512) 555-0100,https://sunny.example.com,hello@sunny.example.com,",
  'Harbor Noodle Bar,"200 Pier St, Unit 3",Seattle,WA,98101,(206) 555-0199,,,Pacific',
].join("\n");

const zoneShort = (id: string) => US_TIME_ZONES.find((z) => z.id === id)?.label.split(" ")[0] ?? id;

export function ImportCsv() {
  const inputId = useId();
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CsvResult | null>(null);
  const [done, setDone] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();

  async function pick(file: File | undefined) {
    setDone(null);
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setFileName(file.name);
      setResult({ rows: [], unknownColumns: [], error: "The file is over 2 MB" });
      return;
    }
    setFileName(file.name);
    setResult(readRestaurantCsv(await file.text()));
  }

  const good = result?.rows.filter((r) => r.input) ?? [];
  const bad = result?.rows.filter((r) => !r.input) ?? [];

  function submit() {
    start(async () => {
      const r = await importRestaurants(good.map((g) => ({ line: g.line, input: g.input }))).catch(() => ({ ok: false as const, error: "Could not import. Check your connection and try again." }));
      setDone(r);
      if (r.ok) setResult(null);
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Import restaurants</h1>
        <p className="mt-1 max-w-2xl text-neutral-600">
          Upload a CSV file with one restaurant per row. In Excel or Google Sheets: File → Download (or Save as) → CSV. You check every row before anything is added.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-10 text-center hover:border-brand">
          <span className="font-semibold">{fileName || "Choose a CSV file"}</span>
          <span className="text-sm text-neutral-500">{fileName ? "Choose another file" : `Up to 500 restaurants`}</span>
        </label>
        <input
          id={inputId}
          type="file"
          accept=".csv,text/csv,text/plain,text/tab-separated-values"
          className="sr-only"
          aria-label="CSV file"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
          <p className="font-semibold">Columns</p>
          <p className="mt-1 text-neutral-600">
            <b>name</b> is required. Optional: address, city, state, zip, phone, website, email, timezone. When timezone is empty it is guessed from the state.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-50 p-2 text-xs text-neutral-700">{SAMPLE}</pre>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE + "\n")}`} download="restaurants-sample.csv" className="mt-2 inline-block font-semibold text-brand">
            Download sample file
          </a>
        </div>
      </div>

      {done && (
        <div role="status" className={`rounded-2xl px-4 py-3 text-sm ${done.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {done.ok ? (
            <>
              <p className="font-semibold">
                Imported {done.created} {done.created === 1 ? "restaurant" : "restaurants"}.
                {done.skipped.length > 0 && ` Skipped ${done.skipped.length} already in the list.`}
              </p>
              {done.skipped.length > 0 && <p className="mt-1">Skipped: {done.skipped.map((s) => `${s.name} (row ${s.line})`).join(", ")}</p>}
              <Link href="/restaurants" className="mt-1 inline-block font-semibold underline">
                See all restaurants
              </Link>
            </>
          ) : (
            done.error
          )}
        </div>
      )}

      {result?.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </p>
      )}

      {result && !result.error && (
        <section aria-label="Preview" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              <b>{good.length}</b> ready to import
              {bad.length > 0 && (
                <>
                  , <b className="text-red-700">{bad.length}</b> with problems (left out)
                </>
              )}
              .{result.unknownColumns.length > 0 && <span className="text-neutral-500"> Ignored columns: {result.unknownColumns.join(", ")}.</span>}
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={pending || good.length === 0}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {pending && <Spinner className="h-4 w-4" />}
              {pending ? "Importing…" : `Import ${good.length} ${good.length === 1 ? "restaurant" : "restaurants"}`}
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs tracking-wider text-neutral-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Time zone</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.rows.map((r) => (
                  <tr key={r.line} className={r.input ? "" : "bg-red-50/60"}>
                    <td className="px-3 py-2 text-neutral-500 tabular-nums">{r.line}</td>
                    <td className="px-3 py-2 font-medium">{r.input?.name ?? r.raw.name ?? ""}</td>
                    <td className="px-3 py-2 text-neutral-600">
                      {[r.input?.addressLine ?? r.raw.addressLine, r.input?.city ?? r.raw.city, r.input?.region ?? r.raw.region, r.input?.postalCode ?? r.raw.postalCode].filter(Boolean).join(", ")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-neutral-600">{r.input?.phone ?? r.raw.phone}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-neutral-600">{r.input ? zoneShort(r.input.timeZone) : r.raw.timeZone}</td>
                    <td className="px-3 py-2">{r.input ? <span className="text-green-700">Ready</span> : <span className="text-red-700">{r.errors.join(". ")}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
