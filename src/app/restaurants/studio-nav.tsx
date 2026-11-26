"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/page-loading";

function PendingHint() {
  const { pending } = useLinkStatus();
  return <Spinner className={`h-3.5 w-3.5 shrink-0 transition-opacity ${pending ? "opacity-100" : "opacity-0"}`} />;
}

/** Thanh trên cùng của Studio. "Bulk upload" và "Import CSV" chỉ hiện với nhân viên. */
export function StudioNav({ staff }: { staff: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/restaurants", label: "Restaurants", active: pathname === "/restaurants" || (pathname.startsWith("/restaurants/") && !/^\/restaurants\/(import|bulk)/.test(pathname)) },
    ...(staff
      ? [
          { href: "/restaurants/bulk", label: "Bulk upload", active: pathname.startsWith("/restaurants/bulk") },
          { href: "/restaurants/import", label: "Import CSV", active: pathname.startsWith("/restaurants/import") },
        ]
      : []),
  ];
  return (
    <nav className="flex min-w-0 gap-1 overflow-x-auto" aria-label="Studio">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
            l.active ? "bg-brand-soft text-brand" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {l.label}
          <PendingHint />
        </Link>
      ))}
    </nav>
  );
}
