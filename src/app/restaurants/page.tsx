import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { PageLoading } from "@/components/page-loading";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff, restaurantScope } from "@/lib/restaurant";
import { restaurantPath } from "@/lib/restaurant-path";
import { AddRestaurantForm } from "./add-restaurant-form";

export const metadata: Metadata = { title: "Restaurants · Skipli Menu" };

const PAGE_SIZE = 200;

// Danh sách nhà hàng trong Studio: tìm theo tên/thành phố, xem quán nào đã có menu, chép mã menu cho Skipli Now.
async function RestaurantList({ searchParams }: { searchParams: PageProps<"/restaurants">["searchParams"] }) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const staff = isStaff(user);
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const filter = sp.filter === "no-menu" || sp.filter === "live" || sp.filter === "review" ? sp.filter : "all";

  const scope = restaurantScope(user);
  const where = {
    ...scope,
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { city: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(filter === "no-menu" ? { items: { none: {} } } : filter === "live" ? { isPublished: true } : filter === "review" ? { menuJobs: { some: { status: "READY" as const } } } : {}),
  };
  const [restaurants, total, all] = await Promise.all([
    db.restaurant.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: PAGE_SIZE,
      select: { id: true, name: true, city: true, region: true, isPublished: true, menuCode: true, updatedAt: true, _count: { select: { items: true, menuJobs: { where: { status: "READY" } } } } },
    }),
    db.restaurant.count({ where }),
    db.restaurant.count({ where: scope }),
  ]);
  // Chủ một quán (không phải nhân viên): vào thẳng quán của mình
  if (!staff && all === 1 && !q && filter === "all") redirect(restaurantPath(restaurants[0].id));
  if (!staff && all === 0) redirect("/onboarding");

  const tabs = [
    { key: "all", label: "All" },
    { key: "review", label: "To review" },
    { key: "no-menu", label: "No menu yet" },
    { key: "live", label: "Live" },
  ];
  const href = (f: string) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(f !== "all" ? { filter: f } : {}) }).toString();
    return p ? `/restaurants?${p}` : "/restaurants";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Restaurants</h1>
          <p className="mt-1 text-neutral-600">
            {all} {all === 1 ? "restaurant" : "restaurants"}. Open one to upload its menu and copy the menu ID for Skipli Now.
          </p>
        </div>
        {staff && (
          <div className="flex gap-2">
            <Link href="/restaurants/bulk" className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Bulk upload
            </Link>
            <Link href="/restaurants/import" className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-neutral-50">
              Import CSV
            </Link>
          </div>
        )}
      </div>

      {staff && <AddRestaurantForm />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="flex flex-1 gap-2" role="search">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <label htmlFor="q" className="sr-only">
            Search restaurants
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search by name or city"
            className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button type="submit" className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </form>
        <nav aria-label="Filter" className="flex gap-1 rounded-full bg-neutral-200/70 p-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={href(t.key)}
              aria-current={t.key === filter ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap ${t.key === filter ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-600">
          {q || filter !== "all" ? "No restaurant matches." : "No restaurants yet. Add one above, or import a CSV file."}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {restaurants.map((r) => {
            const place = [r.city, r.region].filter(Boolean).join(", ");
            const dishes = r._count.items;
            return (
              <li key={r.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={restaurantPath(r.id)} className="font-semibold hover:text-brand hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {place || "No city"} ·{" "}
                    <span className={dishes ? "" : "font-medium text-amber-700"}>{dishes ? `${dishes} ${dishes === 1 ? "dish" : "dishes"}` : "No menu yet"}</span> ·{" "}
                    <span className={r.isPublished ? "text-green-700" : ""}>{r.isPublished ? "Live" : "Off"}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="hidden rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-600 lg:inline" title="Menu ID for Skipli Now">
                    {r.menuCode}
                  </code>
                  <CopyButton text={r.menuCode} label="Copy menu ID" ariaLabel={`Copy menu ID of ${r.name}`} />
                  {r._count.menuJobs > 0 ? (
                    <Link href={restaurantPath(r.id, "menu")} className="rounded-full bg-amber-600 px-3.5 py-1 text-xs font-semibold whitespace-nowrap text-white hover:bg-amber-700">
                      Review upload
                    </Link>
                  ) : (
                    <Link href={restaurantPath(r.id, "menu")} className="rounded-full bg-brand px-3.5 py-1 text-xs font-semibold whitespace-nowrap text-white hover:bg-brand-dark">
                      {dishes ? "Edit menu" : "Upload menu"}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {total > restaurants.length && <p className="text-sm text-neutral-500">Showing the {restaurants.length} most recently updated. Search to find others.</p>}
    </div>
  );
}

export default function RestaurantsPage(props: PageProps<"/restaurants">) {
  return (
    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
      <Suspense fallback={<PageLoading label="Loading restaurants…" width="max-w-5xl" blocks={["h-9 w-56", "h-20", "h-96"]} />}>
        <RestaurantList searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
