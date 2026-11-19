import "dotenv/config";
import { expect, test } from "@playwright/test";
import { pool } from "./db";

// Phase 6: dọn dữ liệu hằng ngày (Vercel Cron gọi /api/cron/cleanup).

test("chỉ chạy khi có mã bí mật; xóa link hết hạn và dữ liệu thống kê quá cũ", async ({ request }) => {
  expect((await request.get("/api/cron/cleanup")).status()).toBe(401);
  expect((await request.get("/api/cron/cleanup", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  test.skip(!process.env.CRON_SECRET, "Chưa có CRON_SECRET trong .env");

  const [r] = (await pool.query(`select id from "Restaurant" where slug = 'lantern-and-ladle'`)).rows;
  const tag = `cleanup-${Date.now()}`;
  await pool.query(`insert into "LoginToken" (id, email, "tokenHash", "expiresAt") values ($1, 'old@example.com', $1, now() - interval '3 days')`, [tag]);
  await pool.query(
    `insert into "PageView" (id, "restaurantId", "visitorHash", source, device, "createdAt") values ($1, $2, 'x', 'DIRECT', 'MOBILE', now() - interval '500 days'), ($1 || '-new', $2, 'x', 'DIRECT', 'MOBILE', now() - interval '100 days')`,
    [tag, r.id],
  );

  const res = await request.get("/api/cron/cleanup", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.removed.loginTokens).toBeGreaterThanOrEqual(1);
  expect(body.removed.pageViews).toBeGreaterThanOrEqual(1);

  expect((await pool.query(`select 1 from "LoginToken" where id = $1`, [tag])).rowCount).toBe(0);
  expect((await pool.query(`select 1 from "PageView" where id = $1`, [tag])).rowCount).toBe(0); // 500 ngày: xóa
  expect((await pool.query(`select 1 from "PageView" where id = $1`, [`${tag}-new`])).rowCount).toBe(1); // 100 ngày: giữ
  await pool.query(`delete from "PageView" where id = $1`, [`${tag}-new`]);
});
