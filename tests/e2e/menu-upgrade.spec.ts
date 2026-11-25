import { expect, test, type Page } from "@playwright/test";
import { expectToast, signIn, uniqueEmail } from "./helpers";

// Trang khách bản nâng cấp: tìm món, ẩn món theo dị ứng, Chef's picks, giờ mở cửa, ảnh;
// và phía chủ quán: tải ảnh, nhập giờ mở cửa, đánh dấu Chef's pick.

/** Địa chỉ ảnh app đã lưu: /media/… (trên máy) hoặc <kho S3>/media/… */
const STORED_IMAGE = /\/media\/[a-z0-9]+\/[a-f0-9]{24}\.(jpg|png|webp)$/;

/** Ảnh PNG 40x30 màu đỏ tạo sẵn (không cần file mẫu). */
function pngFile(name: string) {
  const base64 = "iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAQklEQVR4nO3NMQEAIBADsad2UIB7pLFSA9elMZB1z54ERdZpDBKZ/RpjxFWuMUZc5RpjxFWuMUZc5RpjxFWuMSYWP+NWAWDiCd0LAAAAAElFTkSuQmCC";
  return { name, mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

test("khách: tìm món, ẩn món có chất gây dị ứng, Chef's picks, giờ mở cửa", async ({ page }) => {
  await page.goto("/@lantern-and-ladle");

  // Mọi ảnh trên trang (ảnh bìa, logo, ảnh món, ảnh quán) đều tải được, dù lưu trên máy hay trên kho S3
  // (ảnh "lazy" chỉ tải khi khách cuộn tới; ở đây bắt tải hết để kiểm tra mọi địa chỉ ảnh)
  await page.evaluate(() => document.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((i) => (i.loading = "eager")));
  await expect
    .poll(() => page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src)))
    .toEqual([]);
  const firstImage = await page.locator("img").first().getAttribute("src");
  if (firstImage?.startsWith("http")) {
    // Ảnh trên kho S3: đúng loại file và cho trình duyệt giữ lâu
    const head = await page.request.head(firstImage);
    expect(head.ok()).toBe(true);
    expect(head.headers()["content-type"]).toMatch(/^image\//);
    expect(head.headers()["cache-control"]).toContain("max-age=31536000");
  }

  // Chef's picks có ảnh, bấm mở chi tiết món
  const picks = page.getByRole("region", { name: "Chef's picks" });
  await expect(picks.getByRole("button")).toHaveCount(4);
  await picks.getByRole("button", { name: /Lantern Burger/ }).click();
  await expect(page.getByRole("dialog", { name: "Lantern Burger" }).getByRole("img", { name: "Lantern Burger" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

  // Tìm món
  const search = page.getByRole("searchbox");
  await expect(search).toHaveAttribute("placeholder", "Search 15 dishes");
  await search.fill("salmon");
  await expect(page.getByRole("button", { name: /Grilled Salmon Bowl/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lantern Burger/ })).toHaveCount(0);
  await expect(picks).toHaveCount(0); // đang tìm thì ẩn Chef's picks
  await search.fill("zzz");
  await expect(page.getByText("No dishes match “zzz”.")).toBeVisible();
  await page.getByRole("button", { name: "Show all dishes" }).click();
  await expect(page.getByRole("button", { name: /Lantern Burger/ }).first()).toBeVisible();

  // Ẩn món có Gluten (A): pancakes, burger biến mất; salmon (chỉ có Soy) còn
  await page.getByRole("region", { name: "Allergens" }).getByRole("button", { name: /Gluten/ }).click();
  await expect(page.getByRole("button", { name: /Buttermilk Pancakes/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Grilled Salmon Bowl/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filters 1" })).toBeVisible();
  await page.getByRole("region", { name: "Allergens" }).getByRole("button", { name: /Gluten/ }).click();
  await expect(page.getByRole("button", { name: /Buttermilk Pancakes/ }).first()).toBeVisible();

  // Giờ mở cửa: dòng trạng thái và bảng 7 ngày
  await expect(page.getByTestId("open-status").first()).toContainText(/Open now|Closed/);
  const location = page.getByRole("region", { name: "Location and hours" });
  await expect(location.getByRole("row", { name: /^Monday.*Closed$/ })).toBeVisible();
  await expect(location.getByRole("button", { name: "Copy address" })).toBeVisible();

  // Ảnh giới thiệu và danh sách liên hệ
  await expect(page.getByRole("list", { name: "Photos" }).getByRole("img")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Contact" }).getByText("+1 555 0100")).toBeVisible();
});

/** Mở trang và chờ trang chạy xong phần JavaScript (trước đó bấm/chọn file sẽ không có tác dụng). */
async function gotoReady(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

async function newRestaurantWithItem(page: Page, name: string) {
  await signIn(page, uniqueEmail("photos"));
  await page.getByLabel("Restaurant name").fill(name);
  await page.getByRole("button", { name: "Create my menu" }).click();
  await expect(page).toHaveURL(/\/restaurants\/[^/]+\/menu$/);
  await page.getByRole("button", { name: "Add a category" }).first().click();
  await page.getByRole("dialog").getByLabel("Name *").fill("Mains");
  await page.getByRole("dialog").getByRole("button", { name: "Add category" }).click();
  await expectToast(page, "Category added");
}

test("chủ quán: tải ảnh món (khi tạo món), logo, ảnh giới thiệu, giờ mở cửa, Chef's pick", async ({ page }) => {
  await newRestaurantWithItem(page, "Photo Test Diner");

  // Món mới có ảnh + Chef's pick: ảnh được gửi sau khi lưu món
  await page.getByRole("button", { name: "Add an item to Mains" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name *").fill("Fish Tacos");
  await dialog.getByLabel(/Price/).fill("14");
  await dialog.getByLabel("Upload Photo").setInputFiles(pngFile("tacos.png"));
  await expect(dialog.getByRole("img", { name: "Photo preview" })).toBeVisible();
  await dialog.getByRole("switch", { name: "Chef's pick" }).click();
  await dialog.getByRole("button", { name: "Add item" }).click();
  await expectToast(page, "Item added");

  // Mở lại món: ảnh đã lưu trên máy chủ (đường dẫn /media/…)
  await page.getByRole("button", { name: /Edit Fish Tacos/ }).click();
  await expect(page.getByRole("dialog").getByRole("img", { name: "Photo preview" })).toHaveAttribute("src", STORED_IMAGE);
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  // Logo và ảnh giới thiệu
  await gotoReady(page, "/dashboard/settings");
  await page.getByLabel("Upload Logo").setInputFiles(pngFile("logo.png"));
  await expectToast(page, "Photo saved");
  await expect(page.getByRole("img", { name: "Logo preview" })).toHaveAttribute("src", STORED_IMAGE);
  await page.getByLabel("Add about photos").setInputFiles([pngFile("a.png"), pngFile("b.png")]);
  await expect(page.getByRole("list", { name: "About photos" }).getByRole("img")).toHaveCount(2);
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(page.getByRole("list", { name: "About photos" }).getByRole("img")).toHaveCount(1);

  // Giờ mở cửa: bật, nghỉ Chủ nhật, lưu
  await gotoReady(page, "/dashboard/settings?tab=location");
  await page.getByLabel("Street address").fill("1 Test Road");
  await page.getByLabel("City").fill("Austin");
  await page.getByRole("switch", { name: "Show opening hours" }).click();
  await page.getByRole("switch", { name: "Open on Sunday" }).click();
  await page.getByLabel("Monday opens").fill("10:00");
  await page.getByLabel("Monday closes").fill("22:00");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expectToast(page, "Saved");

  // Bật trang rồi xem như khách
  await gotoReady(page, "/dashboard/settings?tab=page");
  await page.getByRole("switch", { name: "Page is live" }).click();
  await expectToast(page, "Your page is live");
  const slug = (await page.getByText(/localhost:3300\/@/).first().innerText()).split("/@")[1].trim();
  await page.goto(`/@${slug}`);
  await expect(page.getByRole("img", { name: "Photo Test Diner logo" })).toHaveAttribute("src", STORED_IMAGE);
  await expect(page.getByRole("region", { name: "Chef's picks" }).getByRole("button", { name: /Fish Tacos/ })).toBeVisible();
  const hours = page.getByRole("region", { name: "Location and hours" });
  await expect(hours.getByRole("row", { name: /^Monday.*10:00 AM – 10:00 PM$/ })).toBeVisible();
  await expect(hours.getByRole("row", { name: /^Sunday.*Closed$/ })).toBeVisible();
  await expect(page.getByRole("list", { name: "Photos" }).getByRole("img")).toHaveCount(1);

  // Ảnh lạ (không phải ảnh) bị từ chối ngay trên trình duyệt
  await gotoReady(page, "/dashboard/settings");
  await page.getByLabel("Upload Cover photo").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expectToast(page, "Choose a photo (JPG, PNG or WebP)");
});

test("ảnh: chỉ mở được ảnh app đã lưu, không đọc được file khác", async ({ request }) => {
  expect((await request.get("/media/../../.env")).status()).toBe(404);
  expect((await request.get("/media/abc/xyz.jpg")).status()).toBe(404);
  expect((await request.get("/media/aaaaaaaaaaaa/000000000000000000000000.jpg")).status()).toBe(404);
});
