import "server-only";
import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { restaurantTag, slugTag } from "./public";

/**
 * Gọi sau mỗi lần chủ quán lưu thay đổi (chỉ trong server action):
 * xóa bản lưu đệm của trang khách để khách thấy ngay bản mới, và làm mới màn hình chủ quán.
 */
export function expireRestaurantCache(restaurant: { id: string; slug: string }, extraSlugs: string[] = []) {
  const tags = [restaurantTag(restaurant.id), ...[restaurant.slug, ...extraSlugs].map(slugTag)];
  for (const tag of tags) updateTag(tag);
  refresh();
  notifyRemote(tags);
}

/**
 * Bản chạy trên máy dùng chung database với bản trên mạng (REMOTE_APP_URL + REVALIDATE_SECRET):
 * báo bản trên mạng xóa lưu đệm của quán này, để link công khai hiện ngay thay đổi vừa lưu.
 * Chạy sau khi đã trả kết quả cho chủ quán (after), nên không làm chậm nút Lưu; lỗi mạng chỉ ghi log.
 */
function notifyRemote(tags: string[]) {
  const remote = process.env.REMOTE_APP_URL?.replace(/\/$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!remote || !secret) return;
  if (remote === process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")) return; // chính nó, đã xóa ở trên
  after(async () => {
    try {
      const res = await fetch(`${remote}/api/revalidate`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) console.warn(`[revalidate] ${remote} answered ${res.status}; the live menu updates when its cache expires`);
    } catch (e) {
      console.warn(`[revalidate] could not reach ${remote}: ${e instanceof Error ? e.name : "error"}`);
    }
  });
}
