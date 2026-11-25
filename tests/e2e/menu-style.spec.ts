import { expect, test, type Page } from "@playwright/test";
import { signIn, applyMenuStyle, type StyleName } from "./helpers";

// Chủ quán chọn kiểu menu ở Settings → Design; trang khách đổi giao diện khi bấm "Use this style",
// dữ liệu menu giữ nguyên. Dùng quán demo và luôn trả về kiểu Modern khi xong.

const ALL_STYLES: StyleName[] = ["Classic", "Bold", "Grid", "Dark", "Simple", "Modern"];

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
    await applyMenuStyle(page, "Classic");
    await expect(page.getByRole("radio", { name: /^Modern/ })).toHaveAttribute("aria-checked", "false");
    // Màu nhấn đã chuyển sang tab Design
    await expect(page.getByRole("heading", { name: "Accent colour" })).toBeVisible();

    await page.goto("/@lantern-and-ladle");
    await expect(page.locator("[data-menu-style]")).toHaveAttribute("data-menu-style", "CLASSIC");
    await expectMenuContent(page);

    // Tải lại trang Settings: lựa chọn vẫn được lưu
    await page.goto("/dashboard/settings?tab=design");
    await expect(page.getByRole("radio", { name: /^Classic/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: /^Classic/ }).getByText("In use")).toBeVisible();
  } finally {
    await applyMenuStyle(page, "Modern");
  }

  await page.goto("/@lantern-and-ladle");
  await expect(page.locator("[data-menu-style]")).toHaveAttribute("data-menu-style", "PHOTO");
  await expectMenuContent(page);
});

test("cả 6 kiểu: menu đủ món, mở được chi tiết món, không tràn ngang", async ({ page }) => {
  await signIn(page, "demo@example.com");
  // Xem thử từng kiểu qua trang Preview (không đổi trang khách, không cần lưu)
  for (const [key, name] of [["PHOTO", "Modern"], ["CLASSIC", "Classic"], ["BOLD", "Bold"], ["GRID", "Grid"], ["DARK", "Dark"], ["SIMPLE", "Simple"]] as const) {
    await page.goto(`/preview?style=${key}`);
    await expect(page.locator("[data-menu-style]"), name).toHaveAttribute("data-menu-style", key);
    await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
    const pancakes = page.getByRole("region", { name: "Breakfast" }).getByRole("button", { name: /Buttermilk Pancakes/ });
    await expect(pancakes).toBeVisible();
    await pancakes.click();
    await expect(page.getByRole("dialog", { name: "Buttermilk Pancakes" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${name}: page wider than screen`).toBeLessThanOrEqual(0);
  }
});

test("xem thử kiểu mới không đổi trang khách cho tới khi bấm Use this style", async ({ page }) => {
  await signIn(page, "demo@example.com");
  try {
    await applyMenuStyle(page, "Modern");
    await page.getByRole("radio", { name: /^Dark/ }).click();
    await expect(page.getByRole("button", { name: "Use this style" })).toBeVisible();
    // Khung xem thử (màn hình rộng) hiện kiểu Dark
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      const frame = page.frameLocator('iframe[title="Preview of your menu"]');
      await expect(frame.locator("[data-menu-style]")).toHaveAttribute("data-menu-style", "DARK");
    }
    // Trang khách vẫn là Modern
    const guest = await page.context().newPage();
    await guest.goto("/@lantern-and-ladle");
    await expect(guest.locator("[data-menu-style]")).toHaveAttribute("data-menu-style", "PHOTO");
    await guest.close();
    // "Keep Modern" bỏ xem thử
    await page.getByRole("button", { name: "Keep Modern" }).click();
    await expect(page.getByRole("radio", { name: /^Modern/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("button", { name: "Use this style" })).toHaveCount(0);

    // Lưu từng kiểu mới: trang khách đổi theo
    for (const name of ALL_STYLES) {
      await applyMenuStyle(page, name);
      await page.goto("/@lantern-and-ladle");
      await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
    }
  } finally {
    await applyMenuStyle(page, "Modern");
  }
});
