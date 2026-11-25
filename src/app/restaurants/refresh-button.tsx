"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/page-loading";

// Trang quản lý giữ lại các trang đã mở 5 phút (next.config.ts → staleTimes) để chuyển qua lại không phải tải lại.
// Nút này lấy số liệu mới nhất từ database cho mọi trang (ví dụ lượt xem vừa có).
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      aria-label="Refresh data"
      title="Load the latest numbers"
      className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-70"
    >
      {pending ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      )}
      <span className="hidden sm:inline">{pending ? "Refreshing…" : "Refresh"}</span>
    </button>
  );
}
