import type { CSSProperties } from "react";
import { readableTextOn, isHexColor } from "@/lib/menu/color";
import { enabledContacts, headerButtons } from "@/lib/menu/contact";
import type { PublicMenu } from "@/lib/menu/public";
import { MenuBrowser } from "./menu-browser";
import { AboutSection, ContactSection, InfoCard, LocationSection, MenuFooter } from "./sections";
import { styleKit } from "./styles";

// Trang menu khách xem. Phần lớn vẽ sẵn ở máy chủ; chỉ thanh danh mục, tìm/lọc món,
// bảng chi tiết món và trạng thái giờ mở cửa chạy trên máy khách.
// Giao diện đổi theo kiểu menu chủ quán chọn (xem styles/).

/** `track`: bật ở trang khách, tắt ở trang xem trước của chủ quán. */
export function MenuView({ menu, track = false }: { menu: PublicMenu; track?: boolean }) {
  const r = menu.restaurant;
  const kit = styleKit(r.menuStyle);
  const accent = kit.monochrome ? "#111111" : isHexColor(r.accentColor) ? r.accentColor : "#1f4fae";
  const style = { "--accent": accent, "--on-accent": readableTextOn(accent), "--line": kit.theme.line } as CSSProperties;

  return (
    <div style={style} className={`min-h-full flex-1 ${kit.theme.page}`} data-menu-style={r.menuStyle}>
      <kit.Header restaurant={r} buttons={headerButtons(r)} shareUrl={`/@${r.slug}`} />

      <MenuBrowser
        categories={menu.categories}
        currency={r.currency}
        allergens={menu.allergens}
        menuStyle={r.menuStyle}
        trackSlug={track ? r.slug : null}
        aside={<InfoCard r={r} kit={kit} />}
        after={
          <>
            <LocationSection r={r} kit={kit} />
            <AboutSection r={r} kit={kit} />
            <ContactSection r={r} kit={kit} contacts={enabledContacts(r)} />
          </>
        }
      />

      <MenuFooter r={r} kit={kit} />
    </div>
  );
}
