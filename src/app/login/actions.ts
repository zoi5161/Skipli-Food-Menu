"use server";

import { z } from "zod";
import { createLoginLink } from "@/lib/auth";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string; devLink?: string }
  | { status: "error"; message: string; email?: string };

const emailSchema = z.email("Enter a valid email address").max(200);

export async function requestLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = String(formData.get("email") ?? "");
  const parsed = emailSchema.safeParse(raw.trim());
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid email", email: raw };
  }

  const result = await createLoginLink(parsed.data);
  if (!result.ok) return { status: "error", message: result.error, email: raw };

  return {
    status: "sent",
    email: parsed.data,
    // Chỉ khi chạy trên máy: hiện link ngay trên trang vì chưa gửi email thật.
    devLink: process.env.NODE_ENV !== "production" ? result.link : undefined,
  };
}
