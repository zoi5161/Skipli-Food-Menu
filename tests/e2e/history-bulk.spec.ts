import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { query } from "./db";
import { expectToast, signIn } from "./helpers";

// Lịch sử menu (thay cả menu, khôi phục) và Bulk upload (nhiều file, AI đọc phía sau, duyệt sau).
const staffEmail = () => `e2e-staff-${Date.now()}-${Math.floor(Math.random() * 1e6)}@staff.example.com`;
const tag = () => Math.random().toString(36).slice(2, 7);
const PDF = readFileSync("tests/fixtures/menu-sunny-side.pdf"); // menu giả "Sunny Side Pizzeria", 15 món

async function addRestaurant(page: Page, name: string) {
  await page.goto("/restaurants");
  const form = page.getByRole("form", { name: "Add a restaurant" });
  await form.getByPlaceholder("Restaurant name").fill(name);
  await form.getByRole("button", { name: "Add" }).click();
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  return new URL(page.url()).pathname.split("/")[2];
}

const ai = (categories: { name: string; items: { name: string; price: number }[] }[]) => ({
  engine: "gemini",
  categories: categories.map((c) => ({ name: c.name, items: c.items.map((i) => ({ name: i.name, description: null, priceCents: Math.round(i.price * 100), variants: [] })) })),
});

test("thay cả menu: món trùng tên giữ lượt bấm; History lưu bản cũ và khôi phục được", async ({ page }) => {
  await signIn(page, staffEmail());
  const id = await addRestaurant(page, `History Cafe ${tag()}`);

  // Lần 1: thêm 2 món
  await page.route("**/menu/read", (route) => route.fulfill({ json: ai([{ name: "Coffee", items: [{ name: "Latte", price: 4.5 }, { name: "Mocha", price: 5 }] }]) }));
  await page.getByRole("button", { name: "Upload menu" }).click();
  await page.getByRole("dialog").getByLabel("Menu files").setInputFiles({ name: "menu.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await page.getByRole("dialog", { name: "Check the dishes before adding" }).getByRole("button", { name: "Add 2 dishes" }).click();
  await expectToast(page, "Added 2 dishes and 1 new category");
  const [latte] = await query<{ id: string }>(`select id from "MenuItem" where "restaurantId" = $1 and name = 'Latte'`, [id]);
  await query(`insert into "ItemClick" (id, "restaurantId", "itemId", "visitorHash", "createdAt") values ($1, $2, $3, 'h', now())`, [`click-${tag()}`, id, latte.id]);

  // Lần 2: menu mới, chọn "Replace the whole menu"
  await page.unroute("**/menu/read");
  await page.route("**/menu/read", (route) => route.fulfill({ json: ai([{ name: "Drinks", items: [{ name: "Latte", price: 4.75 }, { name: "Cold Brew", price: 5.25 }] }]) }));
  await page.getByRole("button", { name: "Upload menu" }).click();
  await page.getByRole("dialog").getByLabel("Menu files").setInputFiles({ name: "new.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  const review = page.getByRole("dialog", { name: "Check the dishes before adding" });
  await review.getByLabel("Replace the whole menu").check();
  await review.getByRole("button", { name: "Replace menu with 2 dishes" }).click();
  await expectToast(page, "Menu replaced: 2 dishes. The old menu is in History.");

  const after = await query<{ id: string; name: string; priceCents: number }>(`select id, name, "priceCents" from "MenuItem" where "restaurantId" = $1 order by name`, [id]);
  expect(after.map((x) => [x.name, x.priceCents])).toEqual([
    ["Cold Brew", 525],
    ["Latte", 475],
  ]);
  expect(after.find((x) => x.name === "Latte")!.id).toBe(latte.id); // cùng dòng: lượt bấm còn nguyên
  expect((await query(`select id from "ItemClick" where "itemId" = $1`, [latte.id])).length).toBe(1);
  expect((await query(`select id from "Category" where "restaurantId" = $1`, [id])).length).toBe(1); // danh mục "Coffee" cũ đã bỏ

  // History: một bản (trước khi thay), xem được, khôi phục
  await page.getByRole("link", { name: "History" }).click();
  const versions = page.getByRole("list", { name: "Saved versions" });
  await expect(versions.getByRole("listitem")).toHaveCount(1);
  await expect(versions).toContainText("2 dishes in 1 category");
  await expect(versions).toContainText("Before replacing the menu with 2 dishes from a file");
  await versions.getByRole("button", { name: /View version/ }).click();
  const dlg = page.getByRole("dialog", { name: /Version from/ });
  await expect(dlg.getByRole("region", { name: "Category Coffee" })).toContainText("Mocha");
  await dlg.getByRole("button", { name: "Restore this version" }).click();
  await dlg.getByRole("button", { name: "Yes, restore" }).click();
  await expectToast(page, "Menu restored (2 dishes)");

  const restored = await query<{ name: string; priceCents: number; id: string }>(`select id, name, "priceCents" from "MenuItem" where "restaurantId" = $1 order by name`, [id]);
  expect(restored.map((x) => [x.name, x.priceCents])).toEqual([
    ["Latte", 450],
    ["Mocha", 500],
  ]);
  expect(restored.find((x) => x.name === "Latte")!.id).toBe(latte.id);
  // Khôi phục cũng lưu bản trước đó → 2 bản
  await expect(versions.getByRole("listitem")).toHaveCount(2);
});

test("bulk upload: gợi ý quán theo tên file, AI đọc phía sau, duyệt rồi thêm vào menu", async ({ page }) => {
  test.skip(!process.env.GEMINI_API_KEY, "Cần GEMINI_API_KEY (bài này dùng AI thật để đọc PDF)");
  test.setTimeout(240_000);
  await signIn(page, staffEmail());
  const t = tag();
  const name = `Sunny Side Pizzeria ${t}`;
  const id = await addRestaurant(page, name);

  await page.goto("/restaurants/bulk");
  await page.waitForLoadState("networkidle");
  // File 1: tên file khớp quán → tự chọn quán. File 2: PDF trống → AI không đọc được món.
  await page.getByLabel("Menu files").setInputFiles([
    { name: `sunny-side-pizzeria-${t}-menu.pdf`, mimeType: "application/pdf", buffer: PDF },
    { name: "blank.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n") },
  ]);
  await expect(page.getByLabel(`Restaurant for sunny-side-pizzeria-${t}-menu.pdf`)).toHaveValue(name);
  await expect(page.getByText("1 file needs a restaurant.")).toBeVisible();
  await page.getByLabel("Restaurant for blank.pdf").fill(name);
  await page.getByRole("button", { name: "Upload and read 2 files" }).click();

  // Trạng thái tự cập nhật: 1 file đọc xong (chờ duyệt), 1 file lỗi
  // (danh sách có cả file của những lần chạy trước: chỉ xem 2 dòng của quán này)
  const mine = page.getByRole("list", { name: "Uploads" }).getByRole("listitem").filter({ hasText: name });
  await expect(mine.filter({ hasText: "sunny-side" }).getByText(/Ready to review · \d+ dishes/)).toBeVisible({ timeout: 180_000 });
  const blank = mine.filter({ hasText: "blank.pdf" });
  await expect(blank.getByText("Failed", { exact: true })).toBeVisible({ timeout: 180_000 });
  await expect(blank).toContainText("No dish could be read");

  // Danh sách quán: lọc "To review"
  await page.goto(`/restaurants?filter=review&q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name: "Review upload" }).click();
  await page.getByRole("region", { name: "Uploads ready to review" }).getByRole("link", { name: "Review" }).click();
  const review = page.getByRole("dialog", { name: "Check the dishes before adding" });
  await expect(review.getByText(`From sunny-side-pizzeria-${t}-menu.pdf`)).toBeVisible();
  await review.getByRole("button", { name: /^Add \d+ dishes$/ }).click();
  await expectToast(page, /Added \d+ dishes/);
  await expect(page.getByRole("region", { name: "Uploads ready to review" })).toHaveCount(0, { timeout: 15_000 });

  const [job] = await query<{ status: string; dishes: number }>(`select status, dishes from "MenuJob" where "restaurantId" = $1 and "fileName" like 'sunny%'`, [id]);
  expect(job.status).toBe("APPLIED");
  expect(job.dishes).toBeGreaterThanOrEqual(12);
  const [{ n }] = await query<{ n: number }>(`select count(*)::int as n from "MenuItem" where "restaurantId" = $1`, [id]);
  expect(n).toBe(job.dishes);
});

test("không phải nhân viên thì không vào được Bulk upload", async ({ page }) => {
  await signIn(page, `e2e-owner-${Date.now()}@example.com`);
  await page.goto("/restaurants/bulk");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
