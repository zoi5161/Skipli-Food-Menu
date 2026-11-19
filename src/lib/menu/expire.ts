import "server-only";
import { refresh, updateTag } from "next/cache";
import { restaurantTag, slugTag } from "./public";

/**
 * Gọi sau mỗi lần chủ quán lưu thay đổi (chỉ trong server action):
 * xóa bản lưu đệm của trang khách để khách thấy ngay bản mới, và làm mới màn hình chủ quán.
 */
export function expireRestaurantCache(restaurant: { id: string; slug: string }, extraSlugs: string[] = []) {
  updateTag(restaurantTag(restaurant.id));
  for (const slug of [restaurant.slug, ...extraSlugs]) updateTag(slugTag(slug));
  refresh();
}
