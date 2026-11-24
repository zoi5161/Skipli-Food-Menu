import { expect, test } from "@playwright/test";
import { query } from "./db";

// Bản chạy trên máy dùng chung database với bản trên mạng: sau khi lưu, nó gọi /api/revalidate của bản
// trên mạng để xóa lưu đệm trang menu. Ở đây giả lập "bản kia vừa lưu" bằng cách sửa thẳng database
// (app này không biết nên vẫn trả bản cũ), rồi gọi /api/revalidate và xem trang menu đổi ngay.

const SLUG = "lantern-and-ladle";
const secret = process.env.REVALIDATE_SECRET;

test("không có khóa đúng thì bị từ chối", async ({ request }) => {
  expect((await request.post("/api/revalidate", { data: { tags: [`slug:${SLUG}`] } })).status()).toBe(401);
  expect((await request.post("/api/revalidate", { headers: { authorization: "Bearer wrong" }, data: { tags: [`slug:${SLUG}`] } })).status()).toBe(401);
});

test.describe("có khóa", () => {
  test.skip(!secret, "REVALIDATE_SECRET is not set in .env");
  const auth = { authorization: `Bearer ${secret}` };

  test("nhãn sai dạng bị từ chối", async ({ request }) => {
    for (const tags of [[], ["anything"], ["slug:../x"], Array.from({ length: 11 }, (_, i) => `slug:a${i}`)]) {
      expect((await request.post("/api/revalidate", { headers: auth, data: { tags } })).status(), JSON.stringify(tags)).toBe(400);
    }
  });

  test("bản kia sửa database rồi báo xóa lưu đệm: trang menu hiện ngay bản mới", async ({ page, request }) => {
    const [r] = await query<{ id: string; tagline: string | null }>(`select id, tagline from "Restaurant" where slug = $1`, [SLUG]);
    const original = r.tagline;
    const changed = `Fresh from the other app ${Date.now()}`;
    const revalidate = () => request.post("/api/revalidate", { headers: auth, data: { tags: [`restaurant:${r.id}`, `slug:${SLUG}`] } });

    await page.goto(`/@${SLUG}`); // nạp lưu đệm
    await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
    try {
      await query(`update "Restaurant" set tagline = $1 where id = $2`, [changed, r.id]);
      await page.goto(`/@${SLUG}`);
      await expect(page.getByText(changed)).toHaveCount(0); // vẫn là bản lưu đệm cũ

      const res = await revalidate();
      expect(res.status()).toBe(200);
      expect(await res.json()).toEqual({ ok: true, revalidated: 2 });

      await page.goto(`/@${SLUG}`);
      await expect(page.getByText(changed)).toBeVisible();
    } finally {
      await query(`update "Restaurant" set tagline = $1 where id = $2`, [original, r.id]);
      await revalidate();
    }
  });
});
