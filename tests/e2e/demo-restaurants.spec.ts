import { expect, test } from "@playwright/test";

// 4 quán demo theo loại quán phổ biến ở Mỹ (taco Mexico, phở, pizza, cà phê), tạo bởi `npx prisma db seed`.
const DEMOS = [
  { slug: "casa-lupita-taqueria", name: "Casa Lupita Taqueria", dish: "Carne Asada Tacos" },
  { slug: "pho-saigon-corner", name: "Pho Saigon Corner", dish: "Phở Tái (Rare Steak)" },
  { slug: "brick-oven-pizza-co", name: "Brick Oven Pizza Co.", dish: "Margherita" },
  { slug: "morning-grind-cafe", name: "Morning Grind Café", dish: "Latte" },
];

for (const demo of DEMOS) {
  test(`quán demo ${demo.name} mở được và có món`, async ({ page }) => {
    await page.goto(`/@${demo.slug}`);
    await expect(page.getByRole("heading", { name: demo.name, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`^${demo.dish.replace(/[()]/g, "\\$&")}`) }).first()).toBeVisible();
    await expect(page.getByText("not a real place")).toBeVisible();
  });
}

test("kiểu Classic: giá theo cỡ nằm dưới tên món, không tràn khỏi màn hình điện thoại", async ({ page }) => {
  await page.goto("/@pho-saigon-corner");
  const row = page.getByRole("button", { name: /^Phở Đặc Biệt/ });
  await row.scrollIntoViewIfNeeded();
  await expect(row).toContainText("Regular $14.95 / Large $16.95");
  // Trang không bị cuộn ngang
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
