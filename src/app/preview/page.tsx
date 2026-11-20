import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MenuView } from "@/components/public-menu/menu-view";
import { isHexColor } from "@/lib/menu/color";
import { loadPublicMenu } from "@/lib/menu/public";
import { isMenuStyle, MENU_STYLE_INFO } from "@/lib/menu/styles";
import { requireRestaurant } from "@/lib/restaurant";

export const metadata: Metadata = { title: "Preview · Skipli Menu", robots: { index: false, follow: false } };

// Chủ quán xem trước trang khách, kể cả khi trang đang tắt. Không dùng bản lưu đệm, không đếm lượt xem.
// Thử kiểu/màu chưa lưu: /preview?style=DARK&accent=%23b91c1c (chỉ đổi trên màn hình này, trang khách giữ nguyên).
// ?frame=1: bỏ thanh trên cùng, dùng khi nhúng vào khung xem thử ở Settings → Design.
async function Preview({ searchParams }: { searchParams: PageProps<"/preview">["searchParams"] }) {
  const { restaurant } = await requireRestaurant();
  const menu = await loadPublicMenu(restaurant.slug);
  if (!menu) return null;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const style = one(sp.style);
  const accent = one(sp.accent);
  const trying = isMenuStyle(style) && style !== menu.restaurant.menuStyle ? style : null;
  const shown = {
    ...menu,
    restaurant: {
      ...menu.restaurant,
      ...(trying ? { menuStyle: trying } : {}),
      ...(accent && isHexColor(accent) ? { accentColor: accent } : {}),
    },
  };
  return (
    <>
      {one(sp.frame) !== "1" && (
        <div className="flex items-center gap-3 bg-neutral-900 px-4 py-2 text-sm text-white">
          <span className="font-semibold">Preview</span>
          <span className="text-neutral-300">
            {trying
              ? `Trying the ${MENU_STYLE_INFO[trying].name} style. Guests still see your current style.`
              : restaurant.isPublished
                ? "Your page is live."
                : "Your page is off. Only you can see this."}
          </span>
          <Link href={trying ? "/dashboard/settings?tab=design" : "/dashboard"} className="ml-auto font-semibold underline">
            {trying ? "Back to Design" : "Back to dashboard"}
          </Link>
        </div>
      )}
      <MenuView menu={shown} />
    </>
  );
}

export default function PreviewPage(props: PageProps<"/preview">) {
  return (
    <Suspense fallback={<div className="flex-1 bg-white" />}>
      <Preview searchParams={props.searchParams} />
    </Suspense>
  );
}
