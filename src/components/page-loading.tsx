// Màn hình chờ khi trang đang tải: vòng xoay + chữ "Loading…" để người dùng biết app đang chạy,
// bên dưới là khung xám giống bố cục trang sắp hiện.

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Nhãn "đang tải" (vòng xoay + chữ), đọc được bằng trình đọc màn hình. */
export function LoadingBadge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`inline-flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm ${className}`}>
      <Spinner className="h-4 w-4 text-brand" />
      {label}
    </div>
  );
}

/** Khung chờ cho các trang quản lý. */
export function PageLoading({ label, width = "max-w-4xl", blocks = ["h-9 w-40", "h-10 w-80 rounded-full", "h-64"] }: { label: string; width?: string; blocks?: string[] }) {
  return (
    <div className={`mx-auto ${width}`}>
      <LoadingBadge label={label} />
      <div className="mt-6 space-y-5" aria-hidden>
        {blocks.map((b, i) => (
          <div key={i} className={`animate-pulse rounded-2xl bg-neutral-200 ${b}`} />
        ))}
      </div>
    </div>
  );
}
