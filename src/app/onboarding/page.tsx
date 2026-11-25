import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/restaurant";
import { restaurantPath } from "@/lib/restaurant-path";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Create your menu · Skipli Food Menu" };

// Bản đầu: mỗi tài khoản một quán. Đã có quán thì vào thẳng trang Menu.
// (Cùng đích với lúc vừa tạo quán xong, vì Next có thể vẽ lại trang này ngay sau khi tạo.)
async function Gate() {
  const user = await requireUser();
  if (isStaff(user)) redirect("/restaurants"); // nhân viên thêm quán ở Studio
  const existing = await db.restaurant.findFirst({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (existing) redirect(restaurantPath(existing.id, "menu"));
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <AuthCard title="Name your restaurant" subtitle="You can change everything later.">
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <Gate />
      </Suspense>
    </AuthCard>
  );
}
