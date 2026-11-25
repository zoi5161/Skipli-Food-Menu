import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Mở menu quán demo (cần chạy `npx prisma db seed` trước) và chụp ảnh để xem giao diện.
test("menu quán demo hiện đủ và đúng giờ phục vụ", async ({ page }, testInfo) => {
  await signIn(page, "demo@example.com");
  await expect(page).toHaveURL(/\/restaurants\/[^/]+$/);
  await expect(page.getByText("Menu items")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });

  await page.goto("/dashboard/menu");
  await expect(page.getByText(/15 items across 5 categories/)).toBeVisible();
  await expect(page.getByText("Mon–Fri · 7:00 AM–11:00 AM")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Sold out: Mushroom Risotto" })).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: testInfo.outputPath("menu-items.png"), fullPage: true });

  await page.getByRole("button", { name: "Edit Lantern Burger" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("item-dialog.png") });
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto("/dashboard/menu?tab=allergens");
  await expect(page.getByText("Gluten")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("allergens.png"), fullPage: true });
});
