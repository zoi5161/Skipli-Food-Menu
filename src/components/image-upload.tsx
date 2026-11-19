"use client";

import { useId, useRef, useState, useTransition } from "react";
import { removeImage, uploadImage, type ImageTarget } from "@/app/dashboard/media-actions";
import { MAX_GALLERY } from "@/lib/media-limits";
import { resizeImage } from "@/lib/resize-image";
import { cx, useToast } from "./ui";

// Ô tải ảnh cho chủ quán: chọn ảnh → trình duyệt thu nhỏ → gửi lên → hiện ngay.

async function send(target: ImageTarget, blob: Blob, itemId?: string) {
  const form = new FormData();
  form.set("target", target);
  form.set("file", blob, blob.type === "image/png" ? "photo.png" : "photo.jpg");
  if (itemId) form.set("itemId", itemId);
  return uploadImage(form).catch(() => ({ ok: false as const, error: "Upload failed. Check your connection and try again." }));
}

function PhotoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  );
}

/**
 * Một ảnh (logo, ảnh bìa, ảnh món).
 * Món chưa lưu (chưa có itemId): giữ ảnh lại, gọi onPick để màn hình gửi lên sau khi lưu món.
 */
export function ImageField({
  target,
  url,
  itemId,
  label,
  hint,
  shape = "square",
  onPick,
}: {
  target: Exclude<ImageTarget, "gallery">;
  url: string | null;
  itemId?: string;
  label: string;
  hint?: string;
  shape?: "square" | "wide";
  onPick?: (blob: Blob | null) => void;
}) {
  const toast = useToast();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [pending, start] = useTransition();
  const deferred = target === "item" && !itemId;

  function pick(file: File | undefined) {
    if (!file) return;
    start(async () => {
      try {
        const blob = await resizeImage(file, { keepPng: target === "logo", maxEdge: target === "logo" ? 800 : undefined });
        if (deferred) {
          setCurrent(URL.createObjectURL(blob));
          onPick?.(blob);
          return;
        }
        const r = await send(target, blob, itemId);
        if (r.ok) {
          setCurrent(r.url);
          toast("Photo saved");
        } else toast(r.error, "error");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Upload failed", "error");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  function remove() {
    if (deferred) {
      setCurrent(null);
      onPick?.(null);
      return;
    }
    start(async () => {
      const r = await removeImage({ target, itemId }).catch(() => ({ ok: false as const, error: "Could not remove. Try again." }));
      if (r.ok) {
        setCurrent(null);
        toast("Photo removed");
      } else toast(r.error, "error");
    });
  }

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={inputId}
        className={cx(
          "relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 hover:border-neutral-400",
          shape === "wide" ? "h-24 w-40 sm:w-56" : "h-24 w-24",
          current && "border-solid",
        )}
      >
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước
          <img src={current} alt={`${label} preview`} className="h-full w-full object-cover" />
        ) : (
          <PhotoIcon />
        )}
        {pending && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-neutral-700">Uploading…</span>}
      </label>
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium">{label}</p>
        {hint && <p className="text-sm text-neutral-500">{hint}</p>}
        <div className="flex gap-3 text-sm font-semibold">
          <label htmlFor={inputId} className="cursor-pointer text-brand">
            {current ? "Replace" : "Upload photo"}
          </label>
          {current && (
            <button type="button" onClick={remove} disabled={pending} className="text-red-600">
              Remove
            </button>
          )}
        </div>
        <input ref={input} id={inputId} type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label={`Upload ${label}`} disabled={pending} />
      </div>
    </div>
  );
}

/** Ảnh giới thiệu quán (tối đa 6). */
export function GalleryField({ urls }: { urls: string[] }) {
  const toast = useToast();
  const inputId = useId();
  const [list, setList] = useState(urls);
  const [pending, start] = useTransition();

  function add(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_GALLERY - list.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) toast(`Only ${MAX_GALLERY} photos fit. Added the first ${room}.`, "error");
    start(async () => {
      for (const file of chosen) {
        try {
          const r = await send("gallery", await resizeImage(file));
          if (r.ok && r.url) setList((l) => [...l, r.url!]);
          else if (!r.ok) toast(r.error, "error");
        } catch (e) {
          toast(e instanceof Error ? e.message : "Upload failed", "error");
        }
      }
    });
  }

  function remove(url: string) {
    start(async () => {
      const r = await removeImage({ target: "gallery", url }).catch(() => ({ ok: false as const, error: "Could not remove. Try again." }));
      if (r.ok) setList((l) => l.filter((u) => u !== url));
      else toast(r.error, "error");
    });
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6" aria-label="About photos">
        {list.map((url, i) => (
          <li key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh xem trước */}
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              disabled={pending}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </li>
        ))}
        {list.length < MAX_GALLERY && (
          <li>
            <label htmlFor={inputId} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-xs font-semibold text-neutral-500 hover:border-neutral-400">
              <PhotoIcon />
              {pending ? "Uploading…" : "Add"}
            </label>
            <input id={inputId} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} aria-label="Add about photos" disabled={pending} />
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-neutral-500">
        {list.length} / {MAX_GALLERY} photos. Shown in the About section of your page.
      </p>
    </div>
  );
}
