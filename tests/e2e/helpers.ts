import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect, type Cookie, type Page } from "@playwright/test";

// Giữ lại phiên đăng nhập của từng email, lưu ra file để dùng lại qua nhiều lần chạy kiểm tra.
// App chỉ cho xin 5 link mỗi 15 phút cho một email (chống spam), nên tài khoản demo
// dùng lại phiên cũ (còn hạn 30 ngày) thay vì xin link mới cho mỗi bài kiểm tra.
// File nằm trong .playwright-auth/ (không commit).
const SESSION_FILE = ".playwright-auth/sessions.json";

function loadSessions(): Record<string, Cookie[]> {
  try {
    return JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveSession(email: string, cookies: Cookie[]) {
  const all = loadSessions();
  all[email] = cookies;
  mkdirSync(".playwright-auth", { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(all));
}

/** Đăng nhập bằng link hiện trên màn hình (chỉ có khi chạy trên máy). */
export async function signIn(page: Page, email: string) {
  const saved = email.startsWith("e2e-") ? undefined : loadSessions()[email]; // email tạo mới mỗi lần thì không cần lưu
  if (saved) {
    await page.context().addCookies(saved);
    await page.goto("/dashboard");
    if (!new URL(page.url()).pathname.startsWith("/login")) return;
    await page.context().clearCookies(); // phiên đã hết hạn hoặc bị đăng xuất: xin link mới
  }
  await signInWithLink(page, email);
  if (!email.startsWith("e2e-")) saveSession(email, (await page.context().cookies()).filter((c) => c.name === "sfm_session"));
}

async function signInWithLink(page: Page, email: string) {
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

/** Ảnh PNG hợp lệ 40x30 (màu đỏ) dùng chung cho các bài kiểm tra tải ảnh. */
export const SAMPLE_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAQklEQVR4nO3NMQEAIBADsad2UIB7pLFSA9elMZB1z54ERdZpDBKZ/RpjxFWuMUZc5RpjxFWuMUZc5RpjxFWuMSYWP+NWAWDiCd0LAAAAAElFTkSuQmCC", "base64");
