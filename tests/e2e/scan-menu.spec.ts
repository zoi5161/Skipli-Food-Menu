import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_PNG, expectToast, signIn, uniqueEmail } from "./helpers";

// Nhập menu từ ảnh: chủ quán chọn ảnh → AI đọc → xem lại, sửa, bỏ món → thêm vào menu.
// Bài này giả lập câu trả lời của AI (không tốn hạn mức AI thật); phần lưu chạy thật.

const PNG = SAMPLE_PNG;

// Câu trả lời giả của AI: menu quán phở + taqueria
const AI_RESULT = {
  engine: "gemini",
  categories: [
    {
      name: "Phở",
      items: [
        { name: "Phở Tái", description: "Rare steak, rice noodles, beef broth", priceCents: null, variants: [{ name: "Regular", priceCents: 1350 }, { name: "Large", priceCents: 1550 }] },
        { name: "Phở Gà", description: "Chicken pho", priceCents: 1295, variants: [] },
      ],
    },
    {
      name: "Tacos",
      items: [
        { name: "Al Pastor Taco", description: null, priceCents: 400, variants: [] },
        { name: "Carnitas Taco", description: null, priceCents: 400, variants: [] },
      ],
    },
  ],
};

async function newRestaurant(page: Page) {
  await signIn(page, uniqueEmail("scan"));
  await page.getByLabel("Restaurant name").fill("Scan Test Kitchen");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);
  await page.waitForLoadState("networkidle");
}

test("đọc ảnh menu: xem lại, sửa giá, bỏ món, thêm vào menu (danh mục mới + cỡ)", async ({ page }) => {
  await newRestaurant(page);
  // Có sẵn danh mục "Tacos" để kiểm tra món được thêm vào đúng danh mục cũ
  await page.getByRole("button", { name: "Add a category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Tacos");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await expectToast(page, "Category added");

  await page.route("**/api/menu/read-photo", (route) => route.fulfill({ json: AI_RESULT }));
  await page.getByRole("button", { name: "Scan paper menu" }).click();
  const d = page.getByRole("dialog", { name: "Scan paper menu" });
  await d.getByLabel("Menu photos").setInputFiles({ name: "menu.png", mimeType: "image/png", buffer: PNG });

  const review = page.getByRole("dialog", { name: "Check the dishes before adding" });
  await expect(review.getByText("We read 4 dishes in 2 categories.")).toBeVisible();
  await expect(review.getByRole("region", { name: "Category Phở" }).getByText("New category")).toBeVisible();
  await expect(review.getByRole("region", { name: "Category Tacos" }).getByText("Adds to your existing category")).toBeVisible();

  // Sửa giá sai, giá không hợp lệ thì chặn nút thêm
  const price = review.getByLabel("Price of Phở Gà");
  await price.fill("12,95x");
  await expect(review.getByRole("button", { name: "Add 4 dishes" })).toBeDisabled();
  await price.fill("13.25");
  // Sửa giá cỡ Large, bỏ món Carnitas
  await review.getByLabel("Price of Phở Tái Large").fill("16");
  await review.getByLabel("Add Carnitas Taco").uncheck();
  await review.getByRole("button", { name: "Add 3 dishes" }).click();
  await expectToast(page, "Added 3 dishes and 1 new category");

  // Kết quả trong menu: danh mục Phở mới; Tacos có Al Pastor, không có Carnitas
  await expect(page.getByRole("region", { name: "Phở" }).getByRole("button", { name: "from $13.50" })).toBeVisible();
  await expect(page.getByLabel("Price of Phở Gà")).toHaveValue("13.25");
  await expect(page.getByRole("region", { name: "Tacos" }).getByText("Al Pastor Taco")).toBeVisible();
  await expect(page.getByText("Carnitas Taco")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit Phở Tái" }).click();
  await expect(page.getByRole("dialog").getByLabel("Size 2 price")).toHaveValue("16.00");
});

test("AI chưa được cài (chưa có key) hoặc lỗi: báo rõ, không thêm gì", async ({ page }) => {
  test.skip(Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY), "Máy này đã có key AI");
  await newRestaurant(page);
  await page.getByRole("button", { name: "Scan paper menu" }).click();
  await page.getByRole("dialog").getByLabel("Menu photos").setInputFiles({ name: "menu.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Menu scanning isn't set up yet. Add dishes by hand for now.");
  await expect(page.getByRole("dialog").getByText("Take or choose photos")).toBeVisible();
});

test("chưa đăng nhập thì không dùng được AI đọc menu", async ({ request }) => {
  const res = await request.post("/api/menu/read-photo", { multipart: { photo: { name: "m.png", mimeType: "image/png", buffer: PNG } } });
  expect(res.status()).toBe(401);
});
