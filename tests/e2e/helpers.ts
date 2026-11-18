import { expect, type Page } from "@playwright/test";

/** Đăng nhập bằng link hiện trên màn hình (chỉ có khi chạy trên máy). */
export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await page.getByTestId("dev-login-link").click();
  await page.getByRole("button", { name: "Continue to your dashboard" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/verify"));
}

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[aria-live=polite]").getByText(text).first()).toBeVisible();
}
