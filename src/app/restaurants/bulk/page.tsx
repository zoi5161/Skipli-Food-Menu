import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageLoading } from "@/components/page-loading";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/restaurant";
import { listJobs } from "./actions";
import { BulkUpload } from "./bulk-upload";

export const metadata: Metadata = { title: "Bulk upload · Skipli Menu" };
// Nút trên trang này bắt đầu đọc file phía sau (after()): cho phép chạy tới 5 phút.
export const maxDuration = 300;

async function Content() {
  const user = await requireUser();
  if (!isStaff(user)) notFound();
  const [restaurants, jobs] = await Promise.all([
    db.restaurant.findMany({ orderBy: { name: "asc" }, take: 5000, select: { id: true, name: true, city: true, region: true } }),
    listJobs(),
  ]);
  return <BulkUpload restaurants={restaurants.map((r) => ({ id: r.id, name: r.name, place: [r.city, r.region].filter(Boolean).join(", ") }))} initialJobs={jobs} />;
}

export default function BulkPage() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
      <Suspense fallback={<PageLoading label="Loading…" width="max-w-5xl" />}>
        <Content />
      </Suspense>
    </main>
  );
}
