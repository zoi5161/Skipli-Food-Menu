import { expect, test } from "@playwright/test";
import { expectToast, signIn, uniqueEmail } from "./helpers";

test("khách mở menu quán demo: lọc món, xem chi tiết món", async ({ page }) => {
  await page.goto("/@lantern-and-ladle");
  await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
  await expect(page.getByText("Mon–Fri · 7:00 AM–11:00 AM")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+15550100");
  await expect(page.getByText("all-day kitchen")).toHaveJSProperty("tagName", "STRONG"); // mô tả có chữ đậm

  // Món hết vẫn hiện, có nhãn Sold out
  await expect(page.getByRole("button", { name: /Mushroom Risotto/ })).toContainText("Sold out");

  // Lọc món chay thuần (Vegan): burger biến mất, avocado toast còn
  await page.getByRole("button", { name: "Filters" }).click();
  const diets = page.getByRole("group", { name: "Dietary filters" });
  await diets.getByRole("button", { name: "Vegan", exact: true }).click();
  await expect(page.getByRole("button", { name: /Lantern Burger/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Avocado Toast/ })).toBeVisible();
  await diets.getByRole("button", { name: "Vegan", exact: true }).click();

  // Bấm món: hiện bảng chi tiết với extra và dị ứng
  await page.getByRole("region", { name: "Mains" }).getByRole("button", { name: /Lantern Burger/ }).click();
  const sheet = page.getByRole("dialog", { name: "Lantern Burger" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Extra cheese")).toBeVisible();
  await expect(sheet.getByText("Gluten, Dairy, Eggs")).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();

  // Mục dị ứng ở cuối menu
  await expect(page.getByRole("heading", { name: "Allergens" })).toBeVisible();
});

test("link sai thì báo chưa mở, không lỗi", async ({ page }) => {
  await page.goto("/@khong-co-quan-nay");
  await expect(page.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();
});

test("chủ quán bật trang, đổi giá, đổi link: khách thấy ngay", async ({ page, browser }) => {
  await signIn(page, uniqueEmail("publish"));
  await page.getByLabel("Restaurant name").fill("Publish Test Diner");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);

  await page.getByRole("button", { name: "Add a category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Mains");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await page.getByRole("button", { name: "Add an item to Mains" }).click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Fish Tacos");
  await page.getByRole("dialog").getByLabel(/Price/).fill("14");
  await page.getByRole("dialog").getByRole("button", { name: "Add item" }).click();
  await expect(page.getByLabel("Price of Fish Tacos")).toHaveValue("14.00");

  // Khách (trình duyệt khác, chưa đăng nhập): trang đang tắt
  const guest = await (await browser.newContext()).newPage();
  await guest.goto("/@publish-test-diner");
  await expect(guest.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();

  // Chủ quán bật trang
  await page.goto("/dashboard/settings?tab=page");
  await page.getByRole("switch", { name: "Page is live" }).click();
  await expectToast(page, "Your page is live");

  await guest.reload();
  await expect(guest.getByRole("heading", { name: "Publish Test Diner" })).toBeVisible();
  await expect(guest.getByRole("button", { name: /Fish Tacos/ })).toContainText("$14.00");

  // Đổi giá ở trang quản lý → khách tải lại thấy giá mới ngay
  await page.goto("/dashboard/menu");
  await page.getByLabel("Price of Fish Tacos").fill("15.5");
  await page.getByLabel("Price of Fish Tacos").press("Enter");
  await expectToast(page, "Fish Tacos: price saved");
  await guest.reload();
  await expect(guest.getByRole("button", { name: /Fish Tacos/ })).toContainText("$15.50");

  // Thêm nút gọi điện → hiện ở đầu trang khách
  await page.goto("/dashboard/settings?tab=buttons");
  await page.getByRole("switch", { name: "Phone" }).click();
  await page.getByLabel("Phone number").fill("+1 555 010 0199");
  await page.getByRole("button", { name: "Save buttons" }).click();
  await expectToast(page, "Saved");
  await guest.reload();
  await expect(guest.getByRole("link", { name: "Call" }).first()).toHaveAttribute("href", "tel:+15550100199");

  // Đổi link → link mới chạy, link cũ báo chưa mở
  const newSlug = `publish-renamed-${Date.now()}`;
  await page.goto("/dashboard/settings?tab=page");
  await page.getByRole("button", { name: "Change" }).click();
  await page.getByLabel("Page address").fill(newSlug);
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expectToast(page, "Address changed");
  await guest.goto(`/@${newSlug}`);
  await expect(guest.getByRole("heading", { name: "Publish Test Diner" })).toBeVisible();
  await guest.goto("/@publish-test-diner");
  await expect(guest.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();

  // Tắt trang → khách thấy "chưa mở"
  await page.getByRole("switch", { name: "Page is live" }).click();
  await expectToast(page, "Your page is off");
  await guest.goto(`/@${newSlug}`);
  await expect(guest.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();
});

test("báo lỗi rõ ràng khi nhập sai trong cài đặt", async ({ page }) => {
  await signIn(page, uniqueEmail("settings"));
  await page.getByLabel("Restaurant name").fill("Settings Check");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);

  await page.goto("/dashboard/settings");
  await page.getByLabel("Google Maps link").fill("not a link");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Google Maps link: enter a full link starting with https://");

  await page.goto("/dashboard/settings?tab=page");
  await page.getByRole("button", { name: "Change" }).click();
  await page.getByLabel("Page address").fill("lantern-and-ladle"); // quán demo đã dùng
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expectToast(page, "That address is already taken. Try another.");
});
