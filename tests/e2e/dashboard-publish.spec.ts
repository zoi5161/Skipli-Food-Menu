import { expect, test } from "@playwright/test";
import { query } from "./db";
import { signIn, uniqueEmail } from "./helpers";

// Bật/tắt trang khách ngay ở ô "Page status" trên Dashboard. Tắt thì phải xác nhận.
test("bật/tắt trang ngay ở Dashboard, tắt có hỏi lại", async ({ page, browser }) => {
  const email = uniqueEmail("dash-live");
  await signIn(page, email);
  await page.getByLabel("Restaurant name").fill("Dashboard Live Test");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);
  const [{ slug }] = await query<{ slug: string }>(`select r.slug from "Restaurant" r join "User" u on u.id = r."ownerId" where u.email = $1`, [email]);

  await page.goto("/dashboard");
  const toggle = page.getByRole("switch", { name: "Page is live" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/@${slug}`);
  await expect(guest.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();

  // Bật: lưu ngay
  await toggle.click();
  await expect(page.getByText("Your page is live")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await guest.reload();
  await expect(guest.getByRole("heading", { name: "Dashboard Live Test", level: 1 })).toBeVisible();

  // Tắt → hỏi lại → "Keep it live" thì không đổi
  await toggle.click();
  const confirm = page.getByRole("alertdialog", { name: "Turn off your page?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Keep it live" }).click();
  await expect(confirm).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  // Tắt thật
  await toggle.click();
  await page.getByRole("alertdialog", { name: "Turn off your page?" }).getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByText("Your page is off")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await guest.reload();
  await expect(guest.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();

  // Tải lại Dashboard: trạng thái đã được lưu
  await page.reload();
  await expect(page.getByRole("switch", { name: "Page is live" })).toHaveAttribute("aria-checked", "false");
});
