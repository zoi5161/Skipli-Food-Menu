import { expect, test, type APIRequestContext } from "@playwright/test";
import { query } from "./db";
import { signIn } from "./helpers";

// Phase 4: ghi lượt xem / lượt bấm món. Mỗi bài dùng một "IP giả" riêng (x-forwarded-for)
// để đóng vai một khách khác nhau. Máy chủ chỉ dùng IP để băm, không lưu IP.

const SLUG = "lantern-and-ladle";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const fakeIp = () => `198.51.100.${Math.floor(Math.random() * 250) + 1}-${Date.now()}`;

async function send(request: APIRequestContext, data: object, headers: Record<string, string>) {
  const res = await request.post("/api/track", { data: JSON.stringify(data), headers: { "content-type": "text/plain", ...headers } });
  expect(res.status()).toBe(200);
  return (await res.json()) as { counted: boolean; reason?: string };
}

async function demo() {
  const [r] = await query<{ id: string }>(`select id from "Restaurant" where slug = $1`, [SLUG]);
  const items = await query<{ id: string }>(`select id from "MenuItem" where "restaurantId" = $1 order by "createdAt" limit 2`, [r.id]);
  return { id: r.id, items: items.map((i) => i.id) };
}

type View = { source: string; referrerHost: string | null; device: string; city: string | null; region: string | null; country: string | null; visitorHash: string };


test("bỏ qua bot và công cụ xem trước link", async ({ request }) => {
  const ip = fakeIp();
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "WhatsApp/2.23.20.0",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "curl/8.4.0",
  ]) {
    expect(await send(request, { type: "view", slug: SLUG }, { "user-agent": ua, "x-forwarded-for": ip })).toEqual({ counted: false, reason: "bot" });
  }
  expect(await send(request, { type: "view", slug: SLUG }, { "user-agent": "", "x-forwarded-for": ip })).toEqual({ counted: false, reason: "bot" });
});

test("lượt xem: 1 khách chỉ tính 1 lần trong 30 phút; lưu nguồn, loại máy, thành phố; không lưu IP", async ({ request }) => {
  const { id } = await demo();
  const ip = fakeIp();
  const geo = { "x-vercel-ip-city": "Austin", "x-vercel-ip-country-region": "TX", "x-vercel-ip-country": "US" };
  const since = new Date();

  expect(await send(request, { type: "view", slug: SLUG, src: "qr" }, { "user-agent": IPHONE, "x-forwarded-for": ip, ...geo })).toEqual({ counted: true });
  expect(await send(request, { type: "view", slug: SLUG }, { "user-agent": IPHONE, "x-forwarded-for": ip })).toEqual({ counted: false, reason: "duplicate" });
  // Khách khác (IP khác) thì tính
  expect(await send(request, { type: "view", slug: SLUG, referrer: "https://l.instagram.com/x" }, { "user-agent": IPHONE, "x-forwarded-for": fakeIp() })).toEqual({ counted: true });

  const views = await query<View>(`select * from "PageView" where "restaurantId" = $1 and "createdAt" >= ($2::timestamptz at time zone 'UTC') order by "createdAt"`, [id, since.toISOString()]);
  const qr = views.find((v) => v.source === "QR")!;
  expect(qr).toMatchObject({ device: "MOBILE", city: "Austin", region: "TX", country: "US" });
  expect(qr.visitorHash).toMatch(/^[a-f0-9]{32}$/);
  expect(JSON.stringify(views)).not.toContain(ip.split("-")[0]); // không lưu IP ở đâu cả
  expect(views.some((v) => v.source === "INSTAGRAM" && v.referrerHost === "l.instagram.com")).toBe(true);
});

test("lượt bấm món: 1 món chỉ tính 1 lần trong 5 phút; món của quán khác bị từ chối", async ({ request }) => {
  const { items } = await demo();
  const h = { "user-agent": IPHONE, "x-forwarded-for": fakeIp() };
  expect(await send(request, { type: "click", slug: SLUG, itemId: items[0] }, h)).toEqual({ counted: true });
  expect(await send(request, { type: "click", slug: SLUG, itemId: items[0] }, h)).toEqual({ counted: false, reason: "duplicate" });
  expect(await send(request, { type: "click", slug: SLUG, itemId: items[1] }, h)).toEqual({ counted: true });
  expect(await send(request, { type: "click", slug: SLUG, itemId: "cnotarealitem000000000000" }, h)).toEqual({ counted: false, reason: "not-found" });
  expect(await send(request, { type: "click", slug: "no-such-place", itemId: items[0] }, h)).toEqual({ counted: false, reason: "not-found" });
});

test("tối đa 200 sự kiện mỗi khách mỗi ngày", async ({ request }) => {
  const { id, items } = await demo();
  const ip = fakeIp();
  const h = { "user-agent": IPHONE, "x-forwarded-for": ip };
  // Lượt đầu để biết mã khách trong ngày, rồi thêm thẳng 199 sự kiện vào database cho nhanh
  expect(await send(request, { type: "click", slug: SLUG, itemId: items[0] }, h)).toEqual({ counted: true });
  const [first] = await query<{ visitorHash: string }>(`select "visitorHash" from "ItemClick" where "restaurantId" = $1 order by "createdAt" desc limit 1`, [id]);
  // 199 lượt bấm "10 phút trước" (ngoài khoảng chống trùng) cho cùng khách đó
  await query(
    `insert into "ItemClick" (id, "restaurantId", "itemId", "visitorHash", "createdAt")
     select 'test' || md5(random()::text), $1, $2, $3, now() - interval '10 minutes' from generate_series(1, 199)`,
    [id, items[1], first.visitorHash],
  );
  expect(await send(request, { type: "view", slug: SLUG }, h)).toEqual({ counted: false, reason: "daily-limit" });
  await query(`delete from "ItemClick" where "visitorHash" = $1`, [first.visitorHash]);
});

test("dữ liệu gửi lên sai thì bị từ chối", async ({ request }) => {
  for (const data of ["not json", JSON.stringify({ type: "hack", slug: SLUG }), JSON.stringify({ type: "view" })]) {
    const res = await request.post("/api/track", { data, headers: { "content-type": "text/plain", "user-agent": IPHONE } });
    expect(res.status()).toBe(400);
  }
  const big = await request.post("/api/track", { data: "x".repeat(5000), headers: { "content-type": "text/plain" } });
  expect(big.status()).toBe(413);
});

test.describe("trên trình duyệt", () => {
  // Mỗi lần chạy là một "khách mới" (trình duyệt khác nhau), để không bị tính là lượt trùng của lần chạy trước.
  test.use({ userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 run-${Date.now()}` });

  test("mở menu từ QR thì ghi 1 lượt xem nguồn QR và xóa ?src khỏi link; bấm món ghi lượt bấm", async ({ page }) => {
    const isTrack = (r: { url: () => string; request: () => { method: () => string } }) => r.url().endsWith("/api/track") && r.request().method() === "POST";
    const viewDone = page.waitForResponse(isTrack);
    const since = new Date().toISOString();
    await page.goto(`/@${SLUG}?src=qr`);
    expect(await (await viewDone).json()).toEqual({ counted: true });
    await expect(page).toHaveURL(new RegExp(`/@${SLUG}$`)); // link chia sẻ lại không còn ?src=qr
    const [view] = await query<View>(
      `select v.* from "PageView" v join "Restaurant" r on r.id = v."restaurantId" where r.slug = $1 and v."createdAt" >= ($2::timestamptz at time zone 'UTC') order by v."createdAt" desc limit 1`,
      [SLUG, since],
    );
    expect(view).toMatchObject({ source: "QR", device: "DESKTOP" });

    const clickDone = page.waitForResponse(isTrack);
    await page.getByRole("region", { name: "Mains" }).getByRole("button", { name: /Lantern Burger/ }).click();
    expect(await (await clickDone).json()).toEqual({ counted: true });
  });
});

test("chủ quán tự xem trang mình thì không tính; trang xem trước không gửi gì", async ({ page }) => {
  await signIn(page, "demo@example.com");
  const res = await page.request.post("/api/track", { data: JSON.stringify({ type: "view", slug: SLUG }), headers: { "content-type": "text/plain", "user-agent": IPHONE } });
  expect(await res.json()).toEqual({ counted: false, reason: "owner" });

  let sent = false;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/track")) sent = true;
  });
  await page.goto("/preview");
  await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
  await page.getByRole("region", { name: "Mains" }).getByRole("button", { name: /Lantern Burger/ }).click();
  await page.waitForTimeout(500);
  expect(sent).toBe(false);
});
