"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/page-loading";
import { Toggle } from "@/components/ui";
import { setPublished } from "./settings/actions";

// Ô "Page status" ở Dashboard: bật/tắt trang khách ngay tại chỗ.
// Bật thì lưu luôn; tắt thì hỏi lại một lần (tắt rồi khách quét QR sẽ thấy "chưa mở").
export function PageStatusCard({ initialLive }: { initialLive: boolean }) {
  const [live, setLive] = useState(initialLive);
  const [confirmOff, setConfirmOff] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  function apply(next: boolean) {
    setConfirmOff(false);
    setMessage(null);
    setLive(next);
    start(async () => {
      const r = await setPublished(next);
      if (r.ok) setMessage({ text: next ? "Your page is live" : "Your page is off" });
      else {
        setLive(!next); // lưu lỗi thì trả công tắc về như cũ
        setMessage({ text: r.error, error: true });
      }
    });
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">Page status</p>
          <p className="mt-2 flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-green-600" : "bg-red-500"}`} />
            <span className="font-medium">{live ? "Live" : "Off"}</span>
            <span className="text-neutral-500">{live ? "· guests can open your menu" : "· guests see “not open yet”"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {pending && <Spinner className="h-4 w-4 text-neutral-400" />}
          <Toggle checked={live} onChange={(next) => (next ? apply(true) : setConfirmOff(true))} label="Page is live" disabled={pending || confirmOff} />
        </div>
      </div>

      {confirmOff && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alertdialog" aria-label="Turn off your page?">
          <p className="font-medium">Turn off your page?</p>
          <p className="mt-0.5">Guests who open your link or scan your QR code will see “This menu isn’t open yet”.</p>
          <div className="mt-2.5 flex gap-2">
            <button type="button" onClick={() => apply(false)} className="rounded-full bg-amber-600 px-3.5 py-1.5 font-semibold text-white hover:bg-amber-700">
              Turn off
            </button>
            <button type="button" onClick={() => setConfirmOff(false)} className="rounded-full px-3.5 py-1.5 font-semibold text-amber-900 hover:bg-amber-100">
              Keep it live
            </button>
          </div>
        </div>
      )}

      <p aria-live="polite" className={`mt-2 text-sm ${message?.error ? "text-red-600" : "text-green-700"}`}>
        {message?.text}
      </p>

      <p className="mt-1 flex gap-4 text-sm font-semibold">
        <Link href="/dashboard/settings?tab=page" className="text-brand">
          Page settings
        </Link>
        <Link href="/preview" className="text-brand">
          Preview
        </Link>
      </p>
    </div>
  );
}
