"use client";

import { useState } from "react";

/** Nút "Copy" chép một đoạn chữ (mã menu, link) vào bộ nhớ tạm, rồi hiện "Copied" trong 2 giây. */
export function CopyButton({ text, label = "Copy", className = "", ariaLabel }: { text: string; label?: string; className?: string; ariaLabel?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt chặn bộ nhớ tạm (trang không an toàn): chọn chữ để người dùng tự chép
      window.prompt("Copy this:", text);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={ariaLabel}
      className={`rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold whitespace-nowrap hover:bg-neutral-50 ${copied ? "text-green-700" : "text-neutral-800"} ${className}`}
    >
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
