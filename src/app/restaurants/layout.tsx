import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/restaurant";
import { signOutAction } from "./actions";
import { RefreshButton } from "./refresh-button";
import { StudioNav } from "./studio-nav";

// Khung chung của Studio: thanh trên cùng (Restaurants · Import CSV) cho nhân viên Skipli.
// Phần đọc phiên đăng nhập nằm trong <Suspense> để khung trang hiện ngay.
async function TopLinks() {
  const user = await requireUser();
  return <StudioNav staff={isStaff(user)} />;
}

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <Link href="/restaurants" className="shrink-0" aria-label="Skipli Menu studio">
            <Brand size="sm" />
          </Link>
          <span className="h-5 w-px bg-neutral-200" />
          <Suspense fallback={<span className="h-4 w-40 animate-pulse rounded bg-neutral-100" />}>
            <TopLinks />
          </Suspense>
          <div className="ml-auto">
            <RefreshButton />
          </div>
          <form action={signOutAction}>
            <button type="submit" className="text-sm font-medium whitespace-nowrap text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
