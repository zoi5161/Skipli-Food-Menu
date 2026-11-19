import { expect, test, type Page } from "@playwright/test";
import { expectToast, signIn } from "./helpers";

// Chủ quán chọn kiểu menu ở Settings → Design; trang khách đổi giao diện ngay,
// dữ liệu menu giữ nguyên. Dùng quán demo và luôn trả về kiểu Modern khi xong.

async function pickStyle(page: Page, name: "Modern" | "Classic") {
  await page.goto("/dashboard/settings?tab=design");
  const option = page.getByRole("radio", { name: new RegExp(`^${name}`) });
  if ((await option.getAttribute("aria-checked")) === "true") return;
  await option.click();
  await expectToast(page, `${name} style is on your page`);
  await expect(option).toHaveAttribute("aria-checked", "true");
}

async function expectMenuContent(page: Page) {
  await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Breakfast" })).toBeVisible();
  const pancakes = page.getByRole("region", { name: "Breakfast" }).getByRole("button", { name: /Buttermilk Pancakes/ });
  await expect(pancakes).toContainText("from $8.00"); // giá theo cỡ (Short stack / Full stack)
  await expect(page.getByText("Mon–Fri · 7:00 AM–11:00 AM")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Call" })).toBeVisible();

  // Chi tiết món vẫn mở được
  await pancakes.click();
  const sheet = page.getByRole("dialog", { name: "Buttermilk Pancakes" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Contains")).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();

  // Lọc theo chế độ ăn vẫn chạy
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("group", { name: "Dietary filters" }).getByRole("button", { name: "Vegan" }).click();
  await expect(page.getByRole("button", { name: /Buttermilk Pancakes/ })).toHaveCount(0);
}

test("đổi kiểu menu Classic ↔ Modern, trang khách đổi theo, dữ liệu giữ nguyên", async ({ page }) => {
  await signIn(page, "demo@example.com");
  try {
    await pickStyle(page, "Classic");
    await expect(page.getByRole("radio", { name: /^Modern/ })).toHaveAttribute("aria-checked", "false");
    // Màu nhấn đã chuyển sang tab Design
    await expect(page.getByRole("heading", { name: "Accent colour" })).toBeVisible();

    await page.goto("/@lantern-and-ladle");
    await expect(page.locator("[data-menu-style]")).toHaveAttribute("data-menu-style", "CLASSIC");
    await expectMenuContent(page);

    // Tải lại trang Settings: lựa chọn vẫn được lưu
    await page.goto("/dashboard/settings?tab=design");
    await expect(page.getByRole("radio", { name: /^Classic/ })).toHaveAttribute("aria-checked", "true");
  } finally {
    await pickStyle(page, "Modern");
  }

  await page.goto("/@lantern-and-ladle");
  await expect(page.locator("[data-menu-style]")).toHaveAttribute("data-menu-style", "PHOTO");
  await expectMenuContent(page);
});

test("trang khách không bị tràn ngang ở cả 2 kiểu", async ({ page }) => {
  await signIn(page, "demo@example.com");
  try {
    for (const name of ["Classic", "Modern"] as const) {
      await pickStyle(page, name);
      await page.goto("/@lantern-and-ladle");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${name}: page wider than screen`).toBeLessThanOrEqual(0);
    }
  } finally {
    await pickStyle(page, "Modern");
  }
});
