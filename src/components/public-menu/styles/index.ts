import type { MenuStyleKey } from "@/lib/menu/styles";
import { boldStyle } from "./bold";
import { classicStyle } from "./classic";
import { darkStyle } from "./dark";
import { gridStyle } from "./grid";
import { photoStyle } from "./photo";
import { simpleStyle } from "./simple";
import type { StyleKit } from "./types";

// Bảng tra kiểu menu → giao diện. Thêm template mới thì khai báo thêm ở đây.
export const STYLE_KITS: Record<MenuStyleKey, StyleKit> = {
  PHOTO: photoStyle,
  CLASSIC: classicStyle,
  BOLD: boldStyle,
  GRID: gridStyle,
  DARK: darkStyle,
  SIMPLE: simpleStyle,
};

export function styleKit(key: MenuStyleKey | null | undefined): StyleKit {
  return (key && STYLE_KITS[key]) || photoStyle;
}
