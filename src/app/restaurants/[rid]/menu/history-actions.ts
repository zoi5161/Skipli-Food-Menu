"use server";

// Tab History: xem lại và khôi phục một bản menu cũ.

import { db } from "@/lib/db";
import { expireRestaurantCache } from "@/lib/menu/expire";
import { countDoc, parseMenuDoc, replaceMenu, takeSnapshot, type MenuDoc } from "@/lib/menu/history";
import { requireRestaurant } from "@/lib/restaurant";

export type SnapshotResult = { ok: true; doc: MenuDoc } | { ok: false; error: string };

export async function getSnapshot(snapshotId: string): Promise<SnapshotResult> {
  const { restaurant } = await requireRestaurant();
  const snap = await db.menuSnapshot.findFirst({ where: { id: String(snapshotId), restaurantId: restaurant.id }, select: { data: true } });
  if (!snap) return { ok: false, error: "This version was not found. Please reload the page." };
  return { ok: true, doc: parseMenuDoc(snap.data) };
}

/** Đưa menu về đúng bản đã lưu. Menu hiện tại được lưu thành một bản mới trước, nên khôi phục cũng hoàn tác được. */
export async function restoreSnapshot(snapshotId: string): Promise<{ ok: true; items: number } | { ok: false; error: string }> {
  const { restaurant, user } = await requireRestaurant();
  const snap = await db.menuSnapshot.findFirst({ where: { id: String(snapshotId), restaurantId: restaurant.id }, select: { data: true, createdAt: true } });
  if (!snap) return { ok: false, error: "This version was not found. Please reload the page." };
  const doc = parseMenuDoc(snap.data);
  const when = snap.createdAt.toLocaleString("en-US", { timeZone: restaurant.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  await db.$transaction(
    async (tx) => {
      await takeSnapshot(tx, restaurant.id, "restore", `Before restoring the version from ${when}`, user.email);
      await replaceMenu(tx, restaurant.id, doc);
    },
    { timeout: 60_000 },
  );
  expireRestaurantCache(restaurant);
  return { ok: true, items: countDoc(doc).itemCount };
}
