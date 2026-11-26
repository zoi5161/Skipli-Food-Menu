import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { jobsSecret, runWorker } from "@/lib/menu/jobs";
import { isStaff } from "@/lib/restaurant";

// POST /api/menu-jobs/run: chạy một worker đọc file menu trong hàng chờ (trả lời ngay, đọc phía sau).
// Được gọi bởi chính app (kèm "Authorization: Bearer <JOBS_SECRET hoặc REVALIDATE_SECRET>")
// hoặc bởi nhân viên đang mở trang Bulk upload.
export const maxDuration = 300;

function secretOk(header: string | null) {
  const secret = jobsSecret();
  if (!secret) return false;
  const got = Buffer.from(header ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(request: Request) {
  if (!secretOk(request.headers.get("authorization"))) {
    const user = await getCurrentUser();
    if (!user || !isStaff(user)) return new Response("Not allowed", { status: 401 });
  }
  after(() => runWorker());
  return new Response(null, { status: 202 });
}
