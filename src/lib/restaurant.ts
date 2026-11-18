import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/menu/format";

// Những link không được dùng làm tên quán (trùng đường dẫn của app).
const RESERVED_SLUGS = new Set(["admin", "api", "app", "auth", "dashboard", "login", "logout", "menu", "onboarding", "settings", "support"]);

/**
 * Quán của người đang đăng nhập. Bản đầu mỗi tài khoản một quán.
 * Chưa có quán thì chuyển sang trang tạo quán.
 */
export async function requireRestaurant() {
  const user = await requireUser();
  const restaurant = await db.restaurant.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!restaurant) redirect("/onboarding");
  return { user, restaurant };
}

/** Tạo link không trùng: "lantern-and-ladle", rồi "lantern-and-ladle-1", "-2"... */
export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  const start = RESERVED_SLUGS.has(base) ? 1 : 0;
  for (let n = start; n < 1000; n++) {
    const candidate = n === 0 ? base : `${base}-${n}`;
    const taken = await db.restaurant.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}
