import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageLoading } from "@/components/page-loading";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/restaurant";
import { ImportCsv } from "./import-csv";

export const metadata: Metadata = { title: "Import restaurants · Skipli Menu" };

async function Gate() {
  const user = await requireUser();
  if (!isStaff(user)) notFound();
  return <ImportCsv />;
}

export default function ImportPage() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
      <Suspense fallback={<PageLoading label="Loading…" />}>
        <Gate />
      </Suspense>
    </main>
  );
}
