import { expect, test, type Page } from "@playwright/test";
import { query } from "./db";
import { expectToast, signIn } from "./helpers";

// Màn hình duyệt: so sánh với menu đang có + nhắc món thiếu giá / giá $0. Nút "Suggest tags with AI".
const staffEmail = () => `e2e-staff-${Date.now()}-${Math.floor(Math.random() * 1e6)}@staff.example.com`;
const tag = () => Math.random().toString(36).slice(2, 7);
const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");

async function addRestaurant(page: Page, name: string) {
  await page.goto("/restaurants");
  const form = page.getByRole("form", { name: "Add a restaurant" });
  await form.getByPlaceholder("Restaurant name").fill(name);
  await form.getByRole("button", { name: "Add" }).click();
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  return new URL(page.url()).pathname.split("/")[2];
}

type Dish = { name: string; description?: string; priceCents: number | null; variants?: { name: string; priceCents: number }[] };
async function upload(page: Page, categories: { name: string; items: Dish[] }[]) {
  await page.unroute("**/menu/read");
  await page.route("**/menu/read", (route) =>
    route.fulfill({ json: { engine: "gemini", categories: categories.map((c) => ({ name: c.name, items: c.items.map((i) => ({ description: null, variants: [], ...i })) })) } }),
  );
  await page.getByRole("button", { name: "Upload menu" }).click();
  await page.getByRole("dialog").getByLabel("Menu files").setInputFiles({ name: "menu.pdf", mimeType: "application/pdf", buffer: PDF });
  return page.getByRole("dialog", { name: "Check the dishes before adding" });
}

test("duyệt menu mới: món mới / đổi giá / không đổi, nhắc thiếu giá và $0, món sẽ bị xóa", async ({ page }) => {
  await signIn(page, staffEmail());
  await addRestaurant(page, `Compare Cafe ${tag()}`);

  // Menu đang có: Latte $4.50, Mocha $5.00, Tea $3.00
  let review = await upload(page, [{ name: "Coffee", items: [{ name: "Latte", priceCents: 450 }, { name: "Mocha", priceCents: 500 }, { name: "Tea", priceCents: 300 }] }]);
  await expect(review.getByRole("region", { name: "Changes" })).toHaveCount(0); // menu trống: không có gì để so
  await review.getByRole("button", { name: "Add 3 dishes" }).click();
  await expectToast(page, "Added 3 dishes and 1 new category");

  // Menu mới: Latte đổi giá, Tea giữ nguyên, Cold Brew không có giá, Water $0
  review = await upload(page, [
    {
      name: "Coffee",
      items: [
        { name: "latte", priceCents: 475 },
        { name: "Tea", priceCents: 300 },
        { name: "Cold Brew", priceCents: null },
        { name: "Water", priceCents: 0 },
      ],
    },
  ]);
  const changes = review.getByRole("region", { name: "Changes" });
  await expect(changes).toContainText("Compared with the current menu: 2 new · 1 price change · 1 no change");
  await expect(changes).toContainText("2 dishes to check: no price or $0");
  await expect(review.getByText("Price changed: $4.50 → $4.75")).toBeVisible();
  await expect(review.getByText("⚠ No price")).toBeVisible();
  await expect(review.getByText("⚠ Price is $0")).toBeVisible();
  await expect(review.getByText("No change", { exact: true })).toBeVisible();

  // Sửa giá thì hết nhắc
  await review.getByLabel("Price of Water").fill("1.50");
  await expect(changes).toContainText("1 dish to check");
  // "Show changes only" ẩn món không đổi
  await changes.getByLabel("Show changes only").check();
  await expect(review.getByLabel("Price of Tea")).toHaveCount(0);
  await expect(review.getByLabel("Price of latte")).toBeVisible();
  // Thay cả menu: Mocha sẽ bị xóa
  await review.getByLabel("Replace the whole menu").check();
  await expect(changes).toContainText("Will be removed: 1 dish not in the new menu");
  await changes.getByText("Will be removed").click();
  await expect(changes).toContainText("Mocha");
});

test("AI gợi ý nhãn: bỏ tick một gợi ý, lưu đúng phần còn lại", async ({ page }) => {
  test.skip(!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY, "Cần key AI (bài này dùng AI thật)");
  test.setTimeout(150_000);
  await signIn(page, staffEmail());
  const id = await addRestaurant(page, `Tag Grill ${tag()}`);
  const review = await upload(page, [
    {
      name: "Starters",
      items: [
        { name: "Spicy Jalapeño Poppers", description: "Fried jalapeños stuffed with cream cheese, breaded", priceCents: 899 },
        { name: "Grilled Shrimp Skewers", description: "Garlic butter shrimp", priceCents: 1299 },
        { name: "Vegan Garden Salad", description: "Mixed greens, cucumber, tomato, lemon vinaigrette (vegan)", priceCents: 999 },
      ],
    },
  ]);
  await review.getByRole("button", { name: "Add 3 dishes" }).click();
  await expectToast(page, "Added 3 dishes and 1 new category");

  await page.getByRole("button", { name: "Suggest tags with AI" }).click();
  const dlg = page.getByRole("dialog", { name: "Suggested tags" });
  const list = dlg.getByRole("list", { name: "Suggestions" });
  await expect(list).toBeVisible({ timeout: 90_000 });
  await expect(list.getByRole("listitem", { name: "Spicy Jalapeño Poppers" }).getByLabel("Spicy", { exact: true })).toBeChecked();
  await expect(list.getByRole("listitem", { name: "Grilled Shrimp Skewers" }).getByLabel("Shellfish", { exact: true })).toBeChecked();

  // Bỏ tick "Spicy" rồi lưu
  await list.getByRole("listitem", { name: "Spicy Jalapeño Poppers" }).getByLabel("Spicy", { exact: true }).uncheck();
  await dlg.getByRole("button", { name: /^Apply \d+ tags?$/ }).click();
  await expectToast(page, /Tags added to \d+ dish/);

  const rows = await query<{ name: string; dietaryTags: string; allergens: string | null }>(
    `select i.name, i."dietaryTags"::text as "dietaryTags", string_agg(a.name, ',' order by a.name) as allergens
       from "MenuItem" i left join "MenuItemAllergen" ia on ia."itemId" = i.id left join "Allergen" a on a.id = ia."allergenId"
      where i."restaurantId" = $1 group by i.id order by i.name`,
    [id],
  );
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  expect(byName["Spicy Jalapeño Poppers"].dietaryTags).not.toContain("SPICY");
  expect(byName["Grilled Shrimp Skewers"].allergens).toContain("Shellfish");
  expect(byName["Vegan Garden Salad"].dietaryTags).toContain("VEGAN");
});
