import { expect, test, type Page } from "@playwright/test";
import { query } from "./db";
import { signIn, uniqueEmail } from "./helpers";

// Studio cho nhân viên Skipli: danh sách nhà hàng, thêm quán, nhập CSV, mã menu cho Skipli Now.
// Email đuôi @staff.example.com là nhân viên trên máy chạy thử (STAFF_EMAILS trong .env).
const staffEmail = () => `e2e-staff-${Date.now()}-${Math.floor(Math.random() * 1e6)}@staff.example.com`;
const tag = () => Math.random().toString(36).slice(2, 7);

async function addRestaurant(page: Page, name: string, city = "") {
  await page.goto("/restaurants");
  const form = page.getByRole("form", { name: "Add a restaurant" });
  await form.getByPlaceholder("Restaurant name").fill(name);
  if (city) await form.getByPlaceholder("City (optional)").fill(city);
  await form.getByRole("button", { name: "Add" }).click();
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/);
  return new URL(page.url()).pathname.split("/")[2];
}

test("nhân viên: danh sách quán, thêm quán, các mục của quán, mã menu và dữ liệu JSON", async ({ page }) => {
  await signIn(page, staffEmail());
  await expect(page).toHaveURL(/\/restaurants$/); // /dashboard → danh sách quán
  const top = page.getByRole("navigation", { name: "Studio" });
  await expect(top.getByRole("link", { name: "Restaurants" })).toHaveAttribute("aria-current", "page");
  await expect(top.getByRole("link", { name: "Import CSV" })).toBeVisible();

  const name = `Studio Diner ${tag()}`;
  const id = await addRestaurant(page, name, "Austin");
  // Mục của quán: Overview · Menu · Stats · Settings
  for (const label of ["Overview", "Menu", "Stats", "Settings"]) await expect(page.getByRole("link", { name: label, exact: true }).first()).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();

  await page.getByRole("link", { name: "Overview", exact: true }).first().click();
  const code = (await page.getByTestId("menu-id").textContent())!.trim();
  expect(code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  const [{ menuCode }] = await query<{ menuCode: string }>(`select "menuCode"::text from "Restaurant" where id = $1`, [id]);
  expect(menuCode).toBe(code);

  // Thêm một món → dữ liệu JSON theo mã có món đó ngay (lưu đệm được xóa khi lưu)
  const empty = await (await page.request.get(`/api/menus/${code}`)).json();
  expect(empty).toMatchObject({ menuId: code, itemCount: 0, restaurant: { name, address: { city: "Austin" }, published: false } });
  await page.goto(`/restaurants/${id}/menu`);
  await page.getByRole("button", { name: "Add a category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Breakfast");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await page.getByRole("button", { name: "Add an item", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Name *").fill("Migas Plate");
  await d.getByLabel("Price").first().fill("11.50");
  await d.getByRole("button", { name: /^(Add item|Save)$/ }).click();
  await expect(page.getByText("Migas Plate")).toBeVisible();
  await expect
    .poll(async () => (await (await page.request.get(`/api/menus/${code}`)).json()).itemCount)
    .toBe(1);
  const feed = await (await page.request.get(`/api/menus/${code}`)).json();
  expect(feed.categories[0]).toMatchObject({ name: "Breakfast", items: [{ name: "Migas Plate", price: 11.5, sizes: [] }] });

  // Danh sách: quán mới có số món, tìm được theo tên
  await page.goto(`/restaurants?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await expect(page.getByText("1 dish")).toBeVisible();
  expect((await page.request.get("/api/menus/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
});

test("nhập CSV: xem trước, dòng lỗi bị bỏ, quán trùng không nhập lại", async ({ page }) => {
  await signIn(page, staffEmail());
  await page.goto("/restaurants/import");
  await page.waitForLoadState("networkidle");
  const t = tag();
  const csv = ["name,address,city,state,phone", `Alpha Grill ${t},1 Main St,Austin,TX,(512) 555-0101`, `"Beta Noodles ${t}, Inc","2 Pier St, Unit 3",Seattle,WA,`, "X,,,,"].join("\n");
  await page.getByLabel("CSV file").setInputFiles({ name: "list.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview.getByText("ready to import")).toContainText("2");
  await expect(preview.getByText("Name needs at least 2 characters")).toBeVisible();
  await expect(preview.getByRole("cell", { name: "Pacific" })).toBeVisible(); // đoán múi giờ theo bang WA
  await preview.getByRole("button", { name: "Import 2 restaurants" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Imported" })).toContainText("Imported 2 restaurants.");

  const rows = await query<{ name: string; timeZone: string; addressLine: string | null }>(`select name, "timeZone", "addressLine" from "Restaurant" where name like $1 order by name`, [`%${t}%`]);
  expect(rows).toEqual([
    { name: `Alpha Grill ${t}`, timeZone: "America/Chicago", addressLine: "1 Main St" },
    { name: `Beta Noodles ${t}, Inc`, timeZone: "America/Los_Angeles", addressLine: "2 Pier St, Unit 3" },
  ]);

  // Nhập lại cùng file: không tạo trùng
  await page.getByLabel("CSV file").setInputFiles({ name: "list.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Import 2 restaurants" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Imported" })).toContainText("Imported 0 restaurants. Skipped 2 already in the list.");
  expect((await query(`select id from "Restaurant" where name like $1`, [`%${t}%`])).length).toBe(2);
});

test("mở hai quán ở hai tab: lưu ở tab nào thì đổi đúng quán đó", async ({ page, context }) => {
  await signIn(page, staffEmail());
  const a = await addRestaurant(page, `Tab A ${tag()}`);
  const other = await context.newPage();
  const b = await addRestaurant(other, `Tab B ${tag()}`);

  // Tab A mở sau cùng tab B, vẫn phải bật đúng quán A
  await page.goto(`/restaurants/${a}`);
  await page.getByRole("switch", { name: "Page is live" }).click();
  await expect(page.getByText("Your page is live")).toBeVisible();
  const live = await query<{ id: string; isPublished: boolean }>(`select id, "isPublished" from "Restaurant" where id = any($1)`, [[a, b]]);
  expect(Object.fromEntries(live.map((r) => [r.id, r.isPublished]))).toEqual({ [a]: true, [b]: false });
});

test("không phải nhân viên: không vào được quán người khác và trang nhập CSV", async ({ page, browser }) => {
  await signIn(page, staffEmail());
  const staffRestaurant = await addRestaurant(page, `Private ${tag()}`);

  const owner = await (await browser.newContext()).newPage();
  await signIn(owner, uniqueEmail("not-staff"));
  await owner.getByLabel("Restaurant name").fill("Owner Only Cafe");
  await owner.getByRole("button", { name: "Create my menu" }).click();
  await expect(owner).toHaveURL(/\/restaurants\/[^/]+\/menu$/, { timeout: 15_000 });
  await expect(owner.getByRole("link", { name: "Import CSV" })).toHaveCount(0);

  // Trang được gửi dần (streaming) nên mã trạng thái đã là 200; nội dung là trang "không tìm thấy", không lộ dữ liệu quán
  for (const path of [`/restaurants/${staffRestaurant}`, `/restaurants/${staffRestaurant}/menu`, `/preview/${staffRestaurant}`, "/restaurants/import"]) {
    await owner.goto(path);
    await expect(owner.getByText("This page could not be found."), path).toBeVisible();
    await expect(owner.getByText(/Private /), path).toHaveCount(0);
    await expect(owner.getByRole("button", { name: /Import \d/ }), path).toHaveCount(0);
  }
  expect((await owner.request.get(`/restaurants/${staffRestaurant}/qr?format=svg`)).status()).toBe(404);
});
