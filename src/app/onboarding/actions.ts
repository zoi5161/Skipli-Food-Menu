"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { uniqueSlug } from "@/lib/restaurant";
import { restaurantPath } from "@/lib/restaurant-path";

export type OnboardingState = { error?: string };

const nameSchema = z.string().trim().min(2, "Enter at least 2 characters").max(80, "Keep it under 80 characters");

export async function createRestaurant(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const existing = await db.restaurant.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const restaurant =
    existing ??
    (await db.restaurant.create({
      data: { ownerId: user.id, name: parsed.data, slug: await uniqueSlug(parsed.data) },
      select: { id: true },
    }));
  // Trình duyệt còn nhớ "chưa có quán → về trang Onboarding" (giữ trang 5 phút, next.config.ts):
  // xóa bản nhớ đó để vào thẳng trang Menu của quán vừa tạo.
  refresh();
  redirect(restaurantPath(restaurant.id, "menu"));
}
