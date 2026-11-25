"use server";

// Lưu phần cài đặt trang của quán. Mỗi hàm chỉ sửa quán của người đang đăng nhập,
// rồi xóa bản lưu đệm của trang khách để thay đổi hiện ngay.

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { isHexColor } from "@/lib/menu/color";
import { expireRestaurantCache } from "@/lib/menu/expire";
import { slugify } from "@/lib/menu/format";
import { parseHours } from "@/lib/menu/hours";
import { isTimeZone } from "@/lib/timezones";
import { isMenuStyle } from "@/lib/menu/styles";
import { RESERVED_SLUGS, requireRestaurant } from "@/lib/restaurant";

export type SettingsResult = { ok: true; slug?: string } | { ok: false; error: string };

function fail(error: unknown): SettingsResult {
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Invalid input" };
  throw error;
}

/** Ô chữ không bắt buộc: chuỗi rỗng lưu thành null. */
const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}: keep it under ${max} characters`)
    .transform((v) => (v === "" ? null : v));

const url = (label: string) =>
  text(500, label).refine((v) => v === null || /^https?:\/\/\S+\.\S+/.test(v), `${label}: enter a full link starting with https://`);

const phone = (label: string) =>
  text(30, label).refine((v) => v === null || /^\+?[\d\s().-]{7,}$/.test(v), `${label}: use a number like +1 555 010 0100`);

// ── General ──────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().trim().min(2, "Name: enter at least 2 characters").max(80),
  tagline: text(80, "Tagline"),
  description: text(1500, "Description"),
  country: z.string().trim().length(2),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency: use a 3-letter code like USD"),
  googleMapsUrl: url("Google Maps link"),
});

export async function saveGeneral(input: z.input<typeof generalSchema>): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = generalSchema.parse(input);
    await db.restaurant.update({ where: { id: restaurant.id }, data });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Location ─────────────────────────────────────────

const locationSchema = z.object({
  addressLine: text(120, "Street address"),
  city: text(60, "City"),
  region: text(60, "State"),
  postalCode: text(12, "ZIP code"),
  addressNote: text(200, "Directions note"),
  timeZone: z.string().refine(isTimeZone, "Pick a time zone from the list"),
  // null = không hiện giờ mở cửa
  openingHours: z
    .unknown()
    .nullable()
    .transform((v, ctx) => {
      if (v === null) return null;
      const hours = parseHours(v);
      if (!hours) ctx.addIssue({ code: "custom", message: "Hours: each open day needs a start and end time that are different" });
      return hours;
    }),
});

export async function saveLocation(input: z.input<typeof locationSchema>): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const { openingHours, ...data } = locationSchema.parse(input);
    await db.restaurant.update({ where: { id: restaurant.id }, data: { ...data, openingHours: openingHours ?? Prisma.DbNull } });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Page: bật/tắt, link, màu, SEO ─────────────────────

export async function setPublished(isPublished: boolean): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    await db.restaurant.update({ where: { id: restaurant.id }, data: { isPublished: z.boolean().parse(isPublished) } });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function changeSlug(rawSlug: string): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const slug = slugify(z.string().max(60).parse(rawSlug));
    if (slug.length < 3) return { ok: false, error: "Use at least 3 letters or numbers" };
    if (RESERVED_SLUGS.has(slug)) return { ok: false, error: "That address is reserved. Try another." };
    if (slug === restaurant.slug) return { ok: true, slug };
    const taken = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
    if (taken) return { ok: false, error: "That address is already taken. Try another." };
    await db.restaurant.update({ where: { id: restaurant.id }, data: { slug } });
    // Xóa bản lưu đệm của cả link cũ lẫn link mới.
    expireRestaurantCache({ id: restaurant.id, slug }, [restaurant.slug]);
    return { ok: true, slug };
  } catch (e) {
    return fail(e);
  }
}

export async function saveAccentColor(color: string): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    if (!isHexColor(color)) return { ok: false, error: "Pick a colour like #1f4fae" };
    await db.restaurant.update({ where: { id: restaurant.id }, data: { accentColor: color.toLowerCase() } });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveMenuStyle(style: string): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    if (!isMenuStyle(style)) return { ok: false, error: "Pick one of the styles" };
    await db.restaurant.update({ where: { id: restaurant.id }, data: { menuStyle: style } });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const seoSchema = z.object({
  seoTitle: text(60, "SEO title"),
  seoDescription: text(160, "Meta description"),
  inSitemap: z.boolean(),
});

export async function saveSeo(input: z.input<typeof seoSchema>): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = seoSchema.parse(input);
    await db.restaurant.update({ where: { id: restaurant.id }, data });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Buttons ──────────────────────────────────────────

const choice = z.enum(["NONE", "CUSTOM_LINK", "PHONE", "WHATSAPP", "EMAIL", "DIRECTIONS"]);
const buttonsSchema = z.object({
  customLinkLabel: text(30, "Button text"),
  customLinkUrl: url("Custom link"),
  phone: phone("Phone"),
  whatsapp: phone("WhatsApp"),
  contactEmail: text(200, "Email").refine((v) => v === null || z.email().safeParse(v).success, "Email: enter a valid address"),
  showDirections: z.boolean(),
  primaryButton: choice,
  secondaryButton: choice,
});

export async function saveButtons(input: z.input<typeof buttonsSchema>): Promise<SettingsResult> {
  try {
    const { restaurant } = await requireRestaurant();
    const data = buttonsSchema.parse(input);
    if (data.customLinkUrl && !data.customLinkLabel) return { ok: false, error: "Add the text for your custom link button" };
    await db.restaurant.update({ where: { id: restaurant.id }, data });
    expireRestaurantCache(restaurant);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
