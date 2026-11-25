import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/menu/format";
import { isStaffEmail } from "@/lib/staff";
import { RESTAURANT_HEADER } from "@/lib/restaurant-path";

// Những link không được dùng làm tên quán (trùng đường dẫn của app).
export const RESERVED_SLUGS = new Set(["admin", "api", "app", "auth", "dashboard", "login", "logout", "menu", "onboarding", "preview", "restaurants", "settings", "studio", "support"]);

export const isStaff = (user: Pick<CurrentUser, "email">) => isStaffEmail(user.email);

/** Điều kiện lọc những quán người này được làm: nhân viên thì mọi quán, người khác chỉ quán đứng tên mình. */
export function restaurantScope(user: CurrentUser) {
  return isStaff(user) ? {} : { ownerId: user.id };
}

/** Quán `restaurantId` nếu người này được làm, ngược lại null. */
export async function findRestaurantFor(user: CurrentUser, restaurantId: string | null | undefined) {
  if (!restaurantId) return null;
  return db.restaurant.findFirst({ where: { id: restaurantId, ...restaurantScope(user) } });
}

/**
 * Quán đang mở trong Studio (đường dẫn /restaurants/<id>/... hoặc /preview/<id>).
 * proxy.ts đọc <id> từ đường dẫn và gửi kèm, nên cả trang lẫn nút lưu (server action) đều biết đang sửa quán nào,
 * kể cả khi nhân viên mở nhiều quán ở nhiều tab. Không được làm quán đó thì báo "không tìm thấy".
 */
export async function requireRestaurant() {
  const user = await requireUser();
  const restaurantId = (await headers()).get(RESTAURANT_HEADER);
  const restaurant = await findRestaurantFor(user, restaurantId);
  if (!restaurant) notFound();
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
