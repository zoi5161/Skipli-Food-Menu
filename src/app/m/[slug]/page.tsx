import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBadge } from "@/components/page-loading";
import { MenuView } from "@/components/public-menu/menu-view";
import { getPublicMenu } from "@/lib/menu/public";

// Trang menu công khai. Khách mở bằng link /@ten-quan (next.config.ts chuyển ngầm sang /m/ten-quan).
// Không cần đăng nhập. Dữ liệu lấy từ bản lưu đệm nên mở nhanh.

export async function generateMetadata({ params }: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu || !menu.restaurant.isPublished) {
    return { title: "Menu not available", robots: { index: false, follow: false } };
  }
  const r = menu.restaurant;
  const title = r.seoTitle || `${r.name} · Menu`;
  const description = r.seoDescription || r.tagline || `See the menu at ${r.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/@${r.slug}` },
    openGraph: { title, description, type: "website", url: `/@${r.slug}` },
  };
}

async function MenuContent({ params }: { params: PageProps<"/m/[slug]">["params"] }) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu || !menu.restaurant.isPublished) return <NotLive />;
  return <MenuView menu={menu} track />;
}

/** Trang tắt hoặc link sai: không lộ tên quán. */
function NotLive() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-24 text-center">
      <p className="text-5xl" aria-hidden>
        🍽️
      </p>
      <h1 className="mt-4 text-2xl font-bold">This menu isn&apos;t open yet</h1>
      <p className="mt-2 max-w-sm text-neutral-600">Please check back soon, or ask a member of staff for a menu.</p>
    </main>
  );
}

function MenuSkeleton() {
  return (
    <div className="relative mx-auto w-full max-w-2xl flex-1 bg-white">
      <LoadingBadge label="Loading menu…" className="absolute top-4 left-1/2 z-10 -translate-x-1/2" />
      <div className="h-28 animate-pulse bg-neutral-200" />
      <div className="space-y-3 p-4">
        <div className="-mt-12 h-20 w-20 animate-pulse rounded-2xl bg-neutral-300" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    </div>
  );
}

export default function PublicMenuPage(props: PageProps<"/m/[slug]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent params={props.params} />
    </Suspense>
  );
}
