import "server-only";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/restaurant";

/**
 * Đích mới cho đường dẫn cũ (/dashboard..., /preview): chưa đăng nhập → /login; nhân viên → danh sách quán;
 * chủ một quán → `build(id quán)`; chưa có quán → /onboarding.
 * Dùng trong route handler (chuyển hướng ngay bằng mã 307, không phải đợi trang tải xong mới chuyển).
 */
export async function legacyTarget(build: (restaurantId: string) => string): Promise<string> {
  const user = await getCurrentUser();
  return user ? homeFor(user, build) : "/login";
}

/** Trang đầu tiên của một người sau khi đăng nhập (xem legacyTarget). */
export async function homeFor(user: CurrentUser, build: (restaurantId: string) => string): Promise<string> {
  if (isStaff(user)) return "/restaurants";
  const own = await db.restaurant.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
  return own ? build(own.id) : "/onboarding";
}

/** Giữ lại ?tab=...&range=... của đường dẫn cũ. */
export function keepQuery(url: URL): Record<string, string> | undefined {
  const q = Object.fromEntries(url.searchParams);
  return Object.keys(q).length ? q : undefined;
}
