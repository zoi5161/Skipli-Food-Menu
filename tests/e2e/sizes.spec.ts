import { expect, test } from "@playwright/test";
import { applyMenuStyle, expectToast, signIn, uniqueEmail } from "./helpers";

// Giá theo cỡ: chủ quán nhập Small/Large…, khách thấy "Glass $x · Bottle $y" hoặc "from $x".

test("giá theo cỡ: nhập, kiểm tra lỗi, khách thấy đúng, bỏ cỡ về một giá", async ({ page }) => {
  await signIn(page, uniqueEmail("sizes"));
  await page.getByLabel("Restaurant name").fill("Sizes Test Bar");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/);
  await page.getByRole("button", { name: "Add a category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Wine");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await expectToast(page, "Category added");

  // Thêm món có 2 cỡ
  await page.getByRole("button", { name: "Add an item to Wine" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Name *").fill("House Red");
  await d.getByRole("switch", { name: "Has sizes" }).click();
  const save = d.getByRole("button", { name: "Add item" });
  await expect(d.getByText("Each size needs a name")).toBeVisible();
  await expect(save).toBeDisabled();
  await d.getByLabel("Size 1 name").fill("Glass");
  await d.getByLabel("Size 1 price").fill("10");
  await d.getByLabel("Size 2 name").fill("glass");
  await d.getByLabel("Size 2 price").fill("36");
  await expect(d.getByText("Each size needs a different name")).toBeVisible();
  await d.getByLabel("Size 2 name").fill("Bottle");
  await d.getByLabel("Size 2 price").fill("abc");
  await expect(d.getByText("Each size needs a price like 4 or 4.50")).toBeVisible();
  await d.getByLabel("Size 2 price").fill("36");
  await expect(save).toBeEnabled();
  await save.click();
  await expectToast(page, "Item added");

  // Danh sách món: hiện "from $10.00", không có ô sửa giá nhanh
  await expect(page.getByRole("button", { name: "from $10.00" })).toBeVisible();
  await expect(page.getByLabel("Price of House Red")).toHaveCount(0);

  // Bật trang, khách xem
  await page.goto("/dashboard/settings?tab=page");
  await page.waitForLoadState("networkidle");
  await page.getByRole("switch", { name: "Page is live" }).click();
  await expectToast(page, "Your page is live");
  const slug = (await page.getByText(/localhost:3300\/@/).first().innerText()).split("/@")[1].trim();
  await page.goto(`/@${slug}`);
  const row = page.getByRole("region", { name: "Wine" }).getByRole("button", { name: /House Red/ });
  await expect(row).toContainText("Glass $10.00 · Bottle $36.00");
  await row.click();
  const sizes = page.getByRole("dialog", { name: "House Red" }).getByRole("list", { name: "Sizes" });
  await expect(sizes.getByRole("listitem")).toHaveText(["Glass$10.00", "Bottle$36.00"]);

  // Thêm cỡ thứ 3 -> "from"
  await page.goto("/dashboard/menu");
  await page.getByRole("button", { name: "Edit House Red" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "+ Add size" }).click();
  await page.getByRole("dialog").getByLabel("Size 3 name").fill("Half bottle");
  await page.getByRole("dialog").getByLabel("Size 3 price").fill("19.50");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Item saved");
  await page.goto(`/@${slug}`);
  await expect(page.getByRole("region", { name: "Wine" }).getByRole("button", { name: /House Red/ })).toContainText("from $10.00");

  // Bỏ cỡ -> về một giá, sửa giá nhanh được lại
  await page.goto("/dashboard/menu");
  await page.getByRole("button", { name: "Edit House Red" }).click();
  await page.getByRole("dialog").getByRole("switch", { name: "Has sizes" }).click();
  await page.getByRole("dialog").getByLabel(/Price/).fill("12");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Item saved");
  await expect(page.getByLabel("Price of House Red")).toHaveValue("12.00");
  await page.goto(`/@${slug}`);
  await expect(page.getByRole("region", { name: "Wine" }).getByRole("button", { name: /House Red/ })).toContainText("$12.00");
});

test("quán demo: kiểu Classic hiện cỡ dạng 'Glass / Pitcher'", async ({ page }) => {
  await signIn(page, "demo@example.com");
  try {
    await applyMenuStyle(page, "Classic");
    await page.goto("/@lantern-and-ladle");
    await expect(page.getByRole("region", { name: "Drinks" }).getByRole("button", { name: /Fresh Lemonade/ })).toContainText("Glass $4.50 / Pitcher $14.00");
  } finally {
    await applyMenuStyle(page, "Modern");
  }
});
