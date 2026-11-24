import "server-only";
import QRCode from "qrcode";
import { publicSiteUrl } from "./site-url";

// Mã QR dẫn tới trang menu của quán.
// Link trong QR có thêm "?src=qr" để Phase 4 biết khách vào bằng cách quét mã (khác với bấm link).

export function qrTargetUrl(slug: string) {
  return `${publicSiteUrl()}/@${slug}?src=qr`;
}

// Mức sửa lỗi "M": vẫn quét được khi mã bị bẩn/trầy khoảng 15%, mà ô vuông không quá dày.
const OPTIONS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#000000", light: "#ffffff" } };

/** SVG: phóng to bao nhiêu cũng nét, hợp để in. */
export async function qrSvg(slug: string): Promise<string> {
  return QRCode.toString(qrTargetUrl(slug), { ...OPTIONS, type: "svg" });
}

/** PNG 1200×1200: đủ nét để in cỡ A5 hoặc đăng mạng xã hội. */
export async function qrPng(slug: string, width = 1200): Promise<Buffer> {
  return QRCode.toBuffer(qrTargetUrl(slug), { ...OPTIONS, type: "png", width });
}
