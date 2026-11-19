import { expect, test, type Page } from "@playwright/test";
import { signIn, uniqueEmail } from "./helpers";

/** Dùng bộ quét mã có sẵn của Chrome (BarcodeDetector) để đọc mã QR trên trang. */
async function scanQr(page: Page, selector: string): Promise<string | null> {
  return page.evaluate(async (sel) => {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: object) => { detect: (s: ImageBitmapSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector) return "UNSUPPORTED";
    const img = document.querySelector(sel) as HTMLImageElement;
    await img.decode();
    // Vẽ ra canvas cỡ lớn cho chắc (SVG có thể nhỏ trên màn hình)
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 600;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 600, 600);
    const codes = await new Detector({ formats: ["qr_code"] }).detect(canvas);
    return codes[0]?.rawValue ?? null;
  }, selector);
}

test("chưa đăng nhập thì không lấy được mã QR", async ({ request }) => {
  const res = await request.get("/api/qr?format=png");
  expect(res.status()).toBe(401);
});

test("mã QR tải được PNG/SVG, quét ra đúng link menu", async ({ page }) => {
  await signIn(page, uniqueEmail("qr"));
  await page.getByLabel("Restaurant name").fill("QR Test Cafe");
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/dashboard\/menu$/);

  await page.goto("/dashboard");
  const img = page.getByTestId("qr-image");
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

  // Nút tải về: đúng loại file và tên file
  const png = await page.request.get("/api/qr?format=png&download=1");
  expect(png.headers()["content-type"]).toBe("image/png");
  expect(png.headers()["content-disposition"]).toContain('filename="menu-qr-qr-test-cafe');
  const pngBytes = await png.body();
  expect(pngBytes.subarray(1, 4).toString()).toBe("PNG");
  expect(pngBytes.length).toBeGreaterThan(5_000);

  const svg = await page.request.get("/api/qr?format=svg&download=1");
  expect(svg.headers()["content-type"]).toContain("image/svg+xml");
  expect(await svg.text()).toContain("<svg");

  // Quét mã trên màn hình
  const scanned = await scanQr(page, "[data-testid=qr-image]");
  test.skip(scanned === "UNSUPPORTED", "Chrome trên máy này không có BarcodeDetector");
  expect(scanned).toMatch(/\/@qr-test-cafe(-\d+)?\?src=qr$/);

  // Quét PNG đã tải về
  await page.setContent(`<img id="png" src="data:image/png;base64,${pngBytes.toString("base64")}">`);
  expect(await scanQr(page, "#png")).toBe(scanned);

  // Mở link quét được: trang chưa bật nên báo "chưa mở" (link vẫn đúng chỗ)
  await page.goto(scanned!);
  await expect(page.getByRole("heading", { name: "This menu isn't open yet" })).toBeVisible();
});

test("mã QR quán demo mở ra đúng menu", async ({ page }) => {
  await signIn(page, "demo@example.com");
  await page.goto("/dashboard/settings?tab=page");
  await expect(page.getByTestId("qr-image")).toBeVisible();
  const scanned = await scanQr(page, "[data-testid=qr-image]");
  test.skip(scanned === "UNSUPPORTED", "Chrome trên máy này không có BarcodeDetector");
  expect(scanned).toBe("http://localhost:3300/@lantern-and-ladle?src=qr");
  await page.goto(scanned!);
  await expect(page.getByRole("heading", { name: "Lantern & Ladle", level: 1 })).toBeVisible();
});
