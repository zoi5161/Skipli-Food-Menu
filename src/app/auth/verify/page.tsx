import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { consumeLoginToken } from "@/lib/auth";
import { homeFor } from "@/lib/legacy-redirect";
import { restaurantPath } from "@/lib/restaurant-path";

export const metadata: Metadata = { title: "Sign in · Skipli Food Menu" };

// Mở link trong email chỉ hiện nút "Continue"; bấm nút mới đăng nhập.
// Lý do: một số hộp thư tự mở link để quét virus, nếu đăng nhập ngay khi mở link thì link sẽ bị dùng mất.
async function confirmSignIn(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const user = token ? await consumeLoginToken(token) : null;
  // Nhân viên → danh sách nhà hàng; chủ một quán → quán của mình; chưa có quán → tạo quán
  redirect(user ? await homeFor(user, (id) => restaurantPath(id)) : "/auth/verify?invalid=1");
}

async function VerifyContent({ searchParams }: { searchParams: PageProps<"/auth/verify">["searchParams"] }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  if (!token || params.invalid) {
    return (
      <div className="space-y-4">
        <p className="text-neutral-600">This sign-in link is invalid, already used, or expired.</p>
        <Link href="/login" className="inline-block rounded-full bg-brand px-5 py-3 font-semibold text-white">
          Get a new link
        </Link>
      </div>
    );
  }

  return (
    <form action={confirmSignIn}>
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        className="w-full rounded-full bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark"
      >
        Continue to your dashboard
      </button>
    </form>
  );
}

export default function VerifyPage(props: PageProps<"/auth/verify">) {
  return (
    <AuthCard title="Sign in" subtitle="One more tap and you're in.">
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <VerifyContent searchParams={props.searchParams} />
      </Suspense>
    </AuthCard>
  );
}
