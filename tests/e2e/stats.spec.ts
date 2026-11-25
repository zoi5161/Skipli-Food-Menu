import { expect, test } from "@playwright/test";
import { pool } from "./db";
import { expectToast, signIn, uniqueEmail } from "./helpers";

// Phase 5: trang Stats của chủ quán.

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";


test("quán demo: số liệu 30 ngày, đổi 7/90 ngày, biểu đồ có ô thông tin và bảng", async ({ page }) => {
  await signIn(page, "demo@example.com");
  await page.goto("/dashboard/stats");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Stats", level: 1 })).toBeVisible();
  await expect(page.getByText("Days and hours in Central time.")).toBeVisible();
  await expect(page.getByRole("link", { name: "30 days" })).toHaveAttribute("aria-current", "page");

  const views30 = Number((await page.getByTestId("stat-views").innerText()).replace(/,/g, ""));
  expect(views30).toBeGreaterThan(500);

  // Biểu đồ theo ngày: 30 cột; dùng phím Tab tới một cột thì hiện ô thông tin
  const chart = page.getByRole("img", { name: "Menu views per day, last 30 days" });
  await expect(chart.locator("[tabindex='0']")).toHaveCount(30);
  await chart.locator("[tabindex='0']").last().focus();
  await expect(page.getByRole("status").filter({ hasText: /views/ })).toBeVisible();

  // Xem dạng bảng
  const daily = page.getByRole("region", { name: "Menu views per day" });
  await daily.getByText("View as table").click();
  await expect(daily.getByRole("row")).toHaveCount(31);

  await expect(page.getByRole("region", { name: "How guests find you" }).getByText("QR code scans")).toBeVisible();
  await expect(page.getByRole("list", { name: "Most viewed dishes" }).getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("region", { name: "Top places" }).getByText("Springfield, IL, US")).toBeVisible();
  await expect(page.getByRole("region", { name: "Devices" }).getByText("Phone")).toBeVisible();

  // Bản đồ: mặc định "Nearby" (phóng to vùng nhiều khách), chấm Springfield; khách nước ngoài không chấm
  const map = page.getByRole("region", { name: "Where guests are" });
  await expect(map.getByRole("button", { name: "Nearby" })).toHaveAttribute("aria-pressed", "true");
  const springfield = map.getByRole("button", { name: /^Springfield, IL, US: \d+ views$/ });
  await expect(springfield).toBeVisible();
  await springfield.dispatchEvent("click"); // bấm đúng chấm này, không phụ thuộc vị trí con trỏ
  await expect(map.getByRole("status")).toContainText("Springfield, IL, US");
  await expect(map.getByRole("button", { name: /^Tokyo/ })).toHaveCount(0);
  await map.getByRole("button", { name: /views outside this area/ }).click();
  await expect(map.getByRole("button", { name: "United States" })).toHaveAttribute("aria-pressed", "true");
  await expect(map.getByRole("button", { name: /^Los Angeles, CA, US/ })).toBeVisible();
  await map.getByRole("button", { name: /views from outside the US/ }).click();
  await expect(map.getByRole("button", { name: "World", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(map.getByRole("button", { name: /^Tokyo, 13, JP: \d+ views$/ })).toBeVisible();
  await expect(map.locator('path[data-country="JP"]')).not.toHaveAttribute("fill", "#eef0f3"); // Nhật được tô màu
  await expect(map.locator('path[data-country="BR"]')).toHaveAttribute("fill", "#eef0f3"); // Brazil không có khách

  // 7 ngày: ít lượt xem hơn, 7 cột
  await page.getByRole("link", { name: "7 days" }).click();
  await expect(page).toHaveURL(/range=7/);
  await expect(page.getByRole("img", { name: "Menu views per day, last 7 days" }).locator("[tabindex='0']")).toHaveCount(7);
  const views7 = Number((await page.getByTestId("stat-views").innerText()).replace(/,/g, ""));
  expect(views7).toBeLessThan(views30);

  await page.getByRole("link", { name: "90 days" }).click();
  await expect(page.getByRole("img", { name: "Menu views per day, last 90 days" }).locator("[tabindex='0']")).toHaveCount(90);

  // Trang Dashboard có ô tóm tắt 7 ngày
  await page.goto("/dashboard");
  await expect(page.getByRole("region", { name: "Last 7 days" }).getByText("Most viewed dish:")).toBeVisible();
});

test("quán mới: trang trống; khách xem + bấm món thì số liệu hiện đúng, theo múi giờ của quán", async ({ page, request }) => {
  await signIn(page, uniqueEmail("stats"));
  await page.getByLabel("Restaurant name").fill("Stats Test Grill");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/);
  await page.getByRole("button", { name: "Add a category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Mains");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await expectToast(page, "Category added");
  await page.getByRole("button", { name: "Add an item to Mains" }).click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Brisket Plate");
  await page.getByRole("dialog").getByRole("button", { name: "Add item" }).click();
  await expectToast(page, "Item added");

  await page.goto("/dashboard/stats");
  await expect(page.getByText("No views yet in this period")).toBeVisible();
  await expect(page.getByTestId("stat-views")).toHaveText("0");

  // Đặt múi giờ Thái Bình Dương, bật trang
  await page.goto("/dashboard/settings?tab=location");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Time zone").selectOption("America/Los_Angeles");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectToast(page, "Saved");
  await page.goto("/dashboard/settings?tab=page");
  await page.waitForLoadState("networkidle");
  await page.getByRole("switch", { name: "Page is live" }).click();
  await expectToast(page, "Your page is live");
  const slug = (await page.getByText(/localhost:3300\/@/).first().innerText()).split("/@")[1].trim();
  const [{ id: itemId }] = (await pool.query(`select i.id from "MenuItem" i join "Restaurant" r on r.id = i."restaurantId" where r.slug = $1`, [slug])).rows;

  // Một khách quét QR ở Austin, rồi bấm xem món
  const h = { "content-type": "text/plain", "user-agent": IPHONE, "x-forwarded-for": `203.0.113.${Date.now() % 250}`, "x-vercel-ip-city": "Austin", "x-vercel-ip-country-region": "TX", "x-vercel-ip-country": "US", "x-vercel-ip-latitude": "30.2672", "x-vercel-ip-longitude": "-97.7431" };
  expect(await (await request.post("/api/track", { data: JSON.stringify({ type: "view", slug, src: "qr" }), headers: h })).json()).toEqual({ counted: true });
  expect(await (await request.post("/api/track", { data: JSON.stringify({ type: "click", slug, itemId }), headers: h })).json()).toEqual({ counted: true });

  await page.goto("/dashboard/stats?range=7");
  await expect(page.getByText("Days and hours in Pacific time.")).toBeVisible();
  await expect(page.getByTestId("stat-views")).toHaveText("1");
  await expect(page.getByTestId("stat-visitors")).toHaveText("1");
  await expect(page.getByTestId("stat-taps")).toHaveText("1");
  await expect(page.getByTestId("stat-qr")).toHaveText("1");
  await expect(page.getByRole("list", { name: "Most viewed dishes" }).getByText("Brisket Plate")).toBeVisible();
  await expect(page.getByRole("region", { name: "Top places" }).getByText("Austin, TX, US")).toBeVisible();
  await expect(page.getByRole("region", { name: "Where guests are" }).getByRole("button", { name: "Austin, TX, US: 1 views" })).toBeVisible();
  const [{ latitude, longitude }] = (await pool.query(`select latitude, longitude from "PageView" v join "Restaurant" r on r.id = v."restaurantId" where r.slug = $1`, [slug])).rows;
  expect([latitude, longitude]).toEqual([30.3, -97.7]); // chỉ lưu tọa độ làm tròn (~10 km)

  // Lượt xem nằm ở cột "hôm nay" theo giờ Los Angeles
  const todayLA = new Date().toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" });
  const daily = page.getByRole("region", { name: "Menu views per day" });
  await daily.getByText("View as table").click();
  await expect(daily.getByRole("row", { name: new RegExp(`^${todayLA} 1`) })).toBeVisible();
});

test("chưa đăng nhập thì không xem được Stats", async ({ page }) => {
  await page.goto("/dashboard/stats");
  await expect(page).toHaveURL(/\/login/);
});
