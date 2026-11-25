"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, signOut, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff, uniqueSlug } from "@/lib/restaurant";
import { restaurantPath } from "@/lib/restaurant-path";
import { MAX_IMPORT_ROWS, duplicateKey, restaurantInput, type RestaurantInput } from "@/lib/studio/restaurant-csv";

export async function signOutAction() {
  await signOut();
  redirect("/login");
}

async function requireStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isStaff(user)) throw new Error("USER:Only the Skipli team can do this");
  return user;
}

const message = (e: unknown) =>
  e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid input") : e instanceof Error && e.message.startsWith("USER:") ? e.message.slice(5) : "Could not save. Please try again.";

// Quán mới đứng tên nhân viên tạo ra (sau này có thể chuyển cho chủ quán). Trang khách để tắt cho tới khi có menu.
async function createOne(ownerId: string, r: RestaurantInput) {
  return db.restaurant.create({
    data: {
      ownerId,
      name: r.name,
      slug: await uniqueSlug(r.name),
      addressLine: r.addressLine,
      city: r.city,
      region: r.region,
      postalCode: r.postalCode,
      phone: r.phone,
      contactEmail: r.contactEmail,
      timeZone: r.timeZone,
      ...(r.website ? { customLinkLabel: "Website", customLinkUrl: r.website } : {}),
    },
    select: { id: true },
  });
}

export type AddRestaurantState = { error?: string };

/** Ô "Add a restaurant" ở danh sách: tạo quán rồi mở mục Menu của quán đó để tải menu lên. */
export async function addRestaurant(_prev: AddRestaurantState, form: FormData): Promise<AddRestaurantState> {
  let id: string;
  try {
    const user = await requireStaff();
    const input = restaurantInput.parse({ name: form.get("name") ?? "", city: form.get("city") || undefined, region: form.get("region") || undefined });
    id = (await createOne(user.id, input)).id;
  } catch (e) {
    return { error: message(e) };
  }
  refresh();
  redirect(restaurantPath(id, "menu"));
}

export type ImportResult = { ok: true; created: number; skipped: { line: number; name: string }[] } | { ok: false; error: string };

/**
 * Trang Import CSV: lưu các dòng đã xem trước. Kiểm tra lại từng dòng ở đây (không tin dữ liệu từ trình duyệt).
 * Bỏ qua quán đã có (cùng tên + thành phố) và dòng trùng trong file.
 */
export async function importRestaurants(rows: { line: number; input: unknown }[]): Promise<ImportResult> {
  try {
    const user = await requireStaff();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("USER:Nothing to import");
    if (rows.length > MAX_IMPORT_ROWS) throw new Error(`USER:Import up to ${MAX_IMPORT_ROWS} restaurants at a time`);
    const parsed = rows.map((r) => ({ line: Number(r.line) || 0, input: restaurantInput.parse(r.input) }));

    const existing = await db.restaurant.findMany({ select: { name: true, city: true } });
    const seen = new Set(existing.map((r) => duplicateKey(r.name, r.city)));
    const skipped: { line: number; name: string }[] = [];
    let created = 0;
    for (const { line, input } of parsed) {
      const key = duplicateKey(input.name, input.city);
      if (seen.has(key)) {
        skipped.push({ line, name: input.name });
        continue;
      }
      seen.add(key);
      await createOne(user.id, input);
      created++;
    }
    refresh();
    return { ok: true, created, skipped };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
