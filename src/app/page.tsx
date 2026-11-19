import Link from "next/link";
import { Brand } from "@/components/brand";

// Trang giới thiệu tạm. Trang giới thiệu đầy đủ sẽ làm khi có tên thương hiệu.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-lg">
        <Brand />
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Your menu, on every guest&apos;s phone.</h1>
      <p className="text-lg text-neutral-600">
        Put your menu online in minutes, print a QR code for the table, and see which dishes guests look at.
      </p>
      <div>
        <Link href="/login" className="inline-flex rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
          Get started
        </Link>
      </div>
    </main>
  );
}
