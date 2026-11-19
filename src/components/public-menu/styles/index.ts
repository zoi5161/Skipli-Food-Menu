import type { MenuStyleKey } from "@/lib/menu/styles";
import { classicStyle } from "./classic";
import { photoStyle } from "./photo";
import type { StyleKit } from "./types";

// Bảng tra kiểu menu → giao diện. Thêm template mới thì khai báo thêm ở đây.
export const STYLE_KITS: Record<MenuStyleKey, StyleKit> = {
  PHOTO: photoStyle,
  CLASSIC: classicStyle,
};

export function styleKit(key: MenuStyleKey | null | undefined): StyleKit {
  return (key && STYLE_KITS[key]) || photoStyle;
}
