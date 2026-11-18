import { defineConfig, devices } from "@playwright/test";

// Kiểm tra tự động trên trình duyệt. Dùng Chrome có sẵn trong máy (không tải thêm trình duyệt).
// Chạy: npm run test:e2e   (app phải chạy ở cổng 3300, hoặc Playwright sẽ tự bật)
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3300",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1280, height: 860 } } },
    // Giả lập iPhone bằng Chrome (cùng kích thước màn hình và chạm), không cần WebKit.
    {
      name: "mobile",
      use: {
        channel: "chrome",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent: devices["iPhone 13"].userAgent,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3300",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
