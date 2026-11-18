"use client";

// Các khối giao diện nhỏ dùng lại nhiều nơi trong trang chủ quán.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ── Nút ──────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  danger: "text-red-600 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_STYLES[variant],
        className,
      )}
    />
  );
}

// ── Công tắc bật/tắt ─────────────────────────────────

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  tone = "brand",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  tone?: "brand" | "amber";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition disabled:opacity-50",
        checked ? (tone === "amber" ? "bg-amber-500" : "bg-brand") : "bg-neutral-300",
      )}
    >
      <span
        className={cx(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ── Ô nhập ───────────────────────────────────────────

export const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-base outline-none placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-sm";

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium tracking-wider text-neutral-500 uppercase">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

// ── Hộp thoại ────────────────────────────────────────

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // bấm ra ngoài để đóng
      }}
      className="m-auto w-[min(100vw-1.5rem,36rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-3xl bg-white p-0 text-neutral-900 shadow-xl"
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex items-center gap-2 border-t border-neutral-200 px-5 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

// ── Thông báo nhỏ (lỗi / đã lưu) ──────────────────────

type Toast = { id: number; message: string; tone: "error" | "success" };
const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 5000 : 2200);
  }, []);
  return (
    <ToastContext value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "rounded-full px-4 py-2 text-sm font-medium shadow-lg",
              t.tone === "error" ? "bg-red-600 text-white" : "bg-neutral-900 text-white",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ── Ô trống (chưa có dữ liệu) ─────────────────────────

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-neutral-600">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
