"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/stats", label: "Stats" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  if (variant === "tabs") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap ${
              isActive(link.href) ? "bg-brand-soft text-brand" : "text-neutral-600"
            }`}
          >
            {link.label}
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
          className={`rounded-xl px-4 py-2.5 font-medium ${
            isActive(link.href) ? "bg-brand-soft text-brand" : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
