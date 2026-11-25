"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui";
import type { ActionResult } from "../actions";

/**
 * Chạy một thao tác lưu, hiện thông báo lỗi nếu có.
 * Trả về true nếu lưu thành công.
 */
export function useSave() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, successMessage?: string, onDone?: (r: ActionResult) => unknown) {
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) {
          if (successMessage) toast(successMessage);
        } else {
          toast(result.error, "error");
        }
        await onDone?.(result);
      } catch {
        toast("Could not save. Check your connection and try again.", "error");
      }
    });
  }

  return { run, pending };
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "amber" | "green" | "brand" }) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-600",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-50 text-emerald-700",
    brand: "bg-brand-soft text-brand",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
