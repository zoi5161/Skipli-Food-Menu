"use client";

import Link, { useLinkStatus } from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Spinner } from "@/components/page-loading";
import { restaurantPath, type RestaurantTab } from "@/lib/restaurant-path";

/** Vòng xoay nhỏ cạnh mục vừa bấm, trong lúc trang đó đang tải. Luôn chiếm chỗ (chỉ đổi độ mờ) để chữ không bị xô lệch. */
function PendingHint() {
  const { pending } = useLinkStatus();
  return <Spinner className={`h-4 w-4 shrink-0 transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />;
}

const TABS: { tab: RestaurantTab; label: string }[] = [
  { tab: "", label: "Overview" },
  { tab: "menu", label: "Menu" },
  { tab: "stats", label: "Stats" },
  { tab: "settings", label: "Settings" },
];

/** Các mục của một quán trong Studio: Overview · Menu · Stats · Settings. */
export function DashboardNav({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const { rid } = useParams<{ rid: string }>();
  const LINKS = TABS.map((t) => ({ ...t, href: restaurantPath(rid, t.tab) }));
  const home = restaurantPath(rid);
  const isActive = (href: string) => (href === home ? pathname === href : pathname.startsWith(href));

  if (variant === "tabs") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              isActive(link.href) ? "bg-brand-soft text-brand" : "text-neutral-600"
            }`}
          >
            {link.label}
            <PendingHint />
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 font-medium ${
            isActive(link.href) ? "bg-brand-soft text-brand" : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {link.label}
          <PendingHint />
        </Link>
      ))}
    </nav>
  );
}
