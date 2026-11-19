// Màu nhấn của quán.

/** 8 màu chọn sẵn (giống tinh thần 1FoodMenu: đậm, dễ đọc chữ trắng). */
export const ACCENT_PRESETS = ["#16181d", "#2f6b4f", "#b5502d", "#7a2a3a", "#1f4fae", "#5a4a8c", "#245f63", "#5c5a2e"];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Độ sáng tương đối theo chuẩn WCAG. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Chữ trắng hay đen trên nền màu nhấn thì dễ đọc hơn. */
export function readableTextOn(hex: string): "#ffffff" | "#111111" {
  if (!isHexColor(hex)) return "#ffffff";
  const L = luminance(hex);
  const contrastWhite = 1.05 / (L + 0.05);
  const contrastBlack = (L + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? "#ffffff" : "#111111";
}
