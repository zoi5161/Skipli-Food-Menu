"use client";

import { useEffect, useState } from "react";
import { MenuView } from "@/components/public-menu/menu-view";
import { isHexColor } from "@/lib/menu/color";
import type { PublicMenu } from "@/lib/menu/public";
import { isMenuStyle, type MenuStyleKey } from "@/lib/menu/styles";

// Khung xem thử ở Settings → Design: dữ liệu menu tải MỘT lần, sau đó đổi kiểu/màu ngay trong trình duyệt
// khi trang Design gửi tin nhắn { type: "skipli-preview", style, accent } (chỉ nhận từ chính trang web này).
export const PREVIEW_MESSAGE = "skipli-preview";

export function LiveStylePreview({ menu, initialStyle, initialAccent }: { menu: PublicMenu; initialStyle: MenuStyleKey; initialAccent: string }) {
  const [style, setStyle] = useState<MenuStyleKey>(initialStyle);
  const [accent, setAccent] = useState(initialAccent);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== PREVIEW_MESSAGE) return;
      if (isMenuStyle(e.data.style)) setStyle(e.data.style);
      if (typeof e.data.accent === "string" && isHexColor(e.data.accent)) setAccent(e.data.accent);
    }
    window.addEventListener("message", onMessage);
    // Báo trang Design là khung đã sẵn sàng nhận lệnh
    window.parent?.postMessage({ type: `${PREVIEW_MESSAGE}-ready` }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <MenuView menu={{ ...menu, restaurant: { ...menu.restaurant, menuStyle: style, accentColor: accent } }} />;
}
