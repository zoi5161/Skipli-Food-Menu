"use server";

// Tải lên và xóa ảnh của quán: logo, ảnh bìa, ảnh giới thiệu (tối đa 6), ảnh món.
// Chỉ sửa quán của người đang đăng nhập.

import { db } from "@/lib/db";
import { MAX_IMAGE_BYTES, deleteImage, detectImageType, saveImage } from "@/lib/media";
import { expireRestaurantCache } from "@/lib/menu/expire";
import { MAX_GALLERY } from "@/lib/media-limits";
import { requireRestaurant } from "@/lib/restaurant";

export type ImageTarget = "logo" | "cover" | "gallery" | "item";
export type ImageResult = { ok: true; url: string | null } | { ok: false; error: string };

const TARGETS: ImageTarget[] = ["logo", "cover", "gallery", "item"];

export async function uploadImage(form: FormData): Promise<ImageResult> {
  const { restaurant } = await requireRestaurant();
  const target = form.get("target") as ImageTarget;
  const file = form.get("file");
  if (!TARGETS.includes(target)) return { ok: false, error: "Unknown photo slot" };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a photo first" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "That photo is too large. Try one under 3 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) return { ok: false, error: "Use a JPG, PNG or WebP photo" };

  let itemId: string | null = null;
  if (target === "item") {
    itemId = String(form.get("itemId") ?? "");
    const item = await db.menuItem.findFirst({ where: { id: itemId, restaurantId: restaurant.id }, select: { id: true } });
    if (!item) return { ok: false, error: "Dish not found" };
  }
  if (target === "gallery" && restaurant.galleryUrls.length >= MAX_GALLERY) {
    return { ok: false, error: `You can add up to ${MAX_GALLERY} photos. Remove one first.` };
  }

  let url: string;
  try {
    url = await saveImage(restaurant.id, bytes);
  } catch (e) {
    console.error("[media] upload failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "We couldn't save the photo right now. Please try again in a minute." };
  }
  switch (target) {
    case "logo":
      await db.restaurant.update({ where: { id: restaurant.id }, data: { logoUrl: url } });
      await deleteImage(restaurant.id, restaurant.logoUrl);
      break;
    case "cover":
      await db.restaurant.update({ where: { id: restaurant.id }, data: { coverUrl: url } });
      await deleteImage(restaurant.id, restaurant.coverUrl);
      break;
    case "gallery":
      await db.restaurant.update({ where: { id: restaurant.id }, data: { galleryUrls: { push: url } } });
      break;
    case "item": {
      const old = await db.menuItem.findUniqueOrThrow({ where: { id: itemId! }, select: { imageUrl: true } });
      await db.menuItem.update({ where: { id: itemId! }, data: { imageUrl: url } });
      await deleteImage(restaurant.id, old.imageUrl);
      break;
    }
  }
  expireRestaurantCache(restaurant);
  return { ok: true, url };
}

export async function removeImage(input: { target: ImageTarget; url?: string; itemId?: string }): Promise<ImageResult> {
  const { restaurant } = await requireRestaurant();
  switch (input.target) {
    case "logo":
      await db.restaurant.update({ where: { id: restaurant.id }, data: { logoUrl: null } });
      await deleteImage(restaurant.id, restaurant.logoUrl);
      break;
    case "cover":
      await db.restaurant.update({ where: { id: restaurant.id }, data: { coverUrl: null } });
      await deleteImage(restaurant.id, restaurant.coverUrl);
      break;
    case "gallery": {
      if (!input.url || !restaurant.galleryUrls.includes(input.url)) return { ok: false, error: "Photo not found" };
      await db.restaurant.update({ where: { id: restaurant.id }, data: { galleryUrls: restaurant.galleryUrls.filter((u) => u !== input.url) } });
      await deleteImage(restaurant.id, input.url);
      break;
    }
    case "item": {
      const item = await db.menuItem.findFirst({ where: { id: input.itemId ?? "", restaurantId: restaurant.id }, select: { imageUrl: true } });
      if (!item) return { ok: false, error: "Dish not found" };
      await db.menuItem.update({ where: { id: input.itemId! }, data: { imageUrl: null } });
      await deleteImage(restaurant.id, item.imageUrl);
      break;
    }
    default:
      return { ok: false, error: "Unknown photo slot" };
  }
  expireRestaurantCache(restaurant);
  return { ok: true, url: null };
}
