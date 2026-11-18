import { expect, test } from "@playwright/test";
import { expectToast, signIn, uniqueEmail } from "./helpers";

test("chưa đăng nhập thì không vào được dashboard", async ({ page }) => {
  await page.goto("/dashboard/menu");
  await expect(page).toHaveURL(/\/login$/);
});

test("link đăng nhập chỉ dùng được một lần", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(uniqueEmail("once"));
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const link = await page.getByTestId("dev-login-link").getAttribute("href");
  await page.goto(link!);
  await page.getByRole("button", { name: "Continue to your dashboard" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.context().clearCookies();
  await page.goto(link!);
  await page.getByRole("button", { name: "Continue to your dashboard" }).click();
  await expect(page.getByText("invalid, already used, or expired")).toBeVisible();
});

test("chủ quán mới: tạo quán, danh mục, món, sửa giá, hết món", async ({ page }) => {
  await signIn(page, uniqueEmail("owner"));

  // Tạo quán
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Restaurant name").fill("Test Kitchen");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);
  await expect(page.getByText("Start with a category.")).toBeVisible();

  // Thêm danh mục có giờ phục vụ (bữa sáng thứ 2–6, 7:00–11:00)
  await page.getByRole("button", { name: "Add a category" }).first().click();
  const catDialog = page.getByRole("dialog");
  await catDialog.getByLabel("Name *").fill("Breakfast");
  await catDialog.getByRole("button", { name: "Set times" }).click();
  await catDialog.getByRole("button", { name: "Sat" }).click();
  await catDialog.getByRole("button", { name: "Sun" }).click();
  await catDialog.getByLabel("From").fill("07:00");
  await catDialog.getByLabel("Until").fill("11:00");
  await expect(catDialog.getByText("Mon–Fri · 7:00 AM–11:00 AM")).toBeVisible();
  await catDialog.getByRole("button", { name: "Add category" }).click();
  await expectToast(page, "Category added");
  await expect(page.getByText("Mon–Fri · 7:00 AM–11:00 AM")).toBeVisible();

  // Thêm extra và allergen để gắn vào món
  await page.getByRole("link", { name: "Extra", exact: true }).click();
  await page.getByRole("button", { name: "Add an extra" }).click();
  await page.getByLabel("Name").fill("Extra cheese");
  await page.getByLabel("Price").fill("1.50");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("+$1.50")).toBeVisible();

  await page.getByRole("link", { name: "Allergens" }).click();
  await page.getByRole("button", { name: "Add an allergen" }).click();
  await page.getByLabel("Name").fill("Gluten");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Used on 0 items")).toBeVisible();

  // Thêm món
  await page.getByRole("link", { name: "Items" }).click();
  await page.getByRole("button", { name: "Add an item to Breakfast" }).click();
  const itemDialog = page.getByRole("dialog");
  await itemDialog.getByLabel("Name *").fill("Pancakes");
  await itemDialog.getByLabel(/Price/).fill("abc");
  await expect(itemDialog.getByText("Enter a price like 12 or 12.50")).toBeVisible();
  await itemDialog.getByLabel(/Price/).fill("11");
  await itemDialog.getByLabel("Description").fill("Maple syrup, butter");
  await itemDialog.getByRole("button", { name: "Vegetarian" }).click();
  await itemDialog.getByRole("button", { name: "A Gluten" }).click();
  await itemDialog.getByRole("button", { name: /Extra cheese/ }).click();
  await itemDialog.getByRole("button", { name: "Add item" }).click();
  await expectToast(page, "Item added");
  await expect(page.getByLabel("Price of Pancakes")).toHaveValue("11.00");

  // Thêm món thứ hai
  await page.getByRole("button", { name: "Add an item to Breakfast" }).click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Omelette");
  await page.getByRole("dialog").getByLabel(/Price/).fill("13.75");
  await page.getByRole("dialog").getByRole("button", { name: "Add item" }).click();
  await expect(page.getByLabel("Price of Omelette")).toHaveValue("13.75");

  // Sửa nhanh giá ngay trong danh sách
  const price = page.getByLabel("Price of Pancakes");
  await price.fill("12.5");
  await price.press("Enter");
  await expectToast(page, "Pancakes: price saved");

  // Bấm hết món
  await page.getByRole("switch", { name: "Sold out: Pancakes" }).click();
  await expectToast(page, "Pancakes: sold out");

  // Tải lại trang: dữ liệu vẫn còn
  await page.reload();
  await expect(page.getByLabel("Price of Pancakes")).toHaveValue("12.50");
  await expect(page.getByRole("switch", { name: "Sold out: Pancakes" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Vegetarian", { exact: true })).toBeVisible();

  // Kéo thả bằng chuột: đưa Omelette lên đầu
  const rows = page.getByRole("region", { name: "Breakfast" }).getByRole("listitem");
  await expect(rows.first()).toContainText("Pancakes");
  const from = await rows.nth(1).getByRole("button", { name: "Drag to reorder" }).boundingBox();
  const to = await rows.nth(0).getByRole("button", { name: "Drag to reorder" }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + from!.width / 2, from!.y - 10, { steps: 5 });
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 2, { steps: 10 });
  await page.mouse.up();
  await expect(rows.first()).toContainText("Omelette");
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole("region", { name: "Breakfast" }).getByRole("listitem").first()).toContainText("Omelette");

  // Kéo thả bằng bàn phím (cho người không dùng chuột): đưa Pancakes trở lên đầu
  await rows.nth(1).getByRole("button", { name: "Drag to reorder" }).focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await expect(rows.first()).toContainText("Pancakes");
});
