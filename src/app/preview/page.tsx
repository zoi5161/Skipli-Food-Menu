import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MenuView } from "@/components/public-menu/menu-view";
import { loadPublicMenu } from "@/lib/menu/public";
import { requireRestaurant } from "@/lib/restaurant";

export const metadata: Metadata = { title: "Preview · Skipli Food Menu", robots: { index: false, follow: false } };

// Chủ quán xem trước trang khách, kể cả khi trang đang tắt. Không dùng bản lưu đệm.
async function Preview() {
  const { restaurant } = await requireRestaurant();
  const menu = await loadPublicMenu(restaurant.slug);
  if (!menu) return null;
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-neutral-900 px-4 py-2 text-sm text-white">
        <span className="font-semibold">Preview</span>
        <span className="text-neutral-300">{restaurant.isPublished ? "Your page is live." : "Your page is off. Only you can see this."}</span>
        <Link href="/dashboard" className="ml-auto font-semibold underline">
          Back to dashboard
        </Link>
      </div>
      <MenuView menu={menu} />
    </>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-white" />}>
      <Preview />
    </Suspense>
  );
}
