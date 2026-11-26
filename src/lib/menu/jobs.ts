import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { MenuFileMissingError, deleteMenuFile, readMenuFile } from "@/lib/menu-files";
import { appUrl } from "@/lib/site-url";
import { readMenuForRestaurant } from "./read-file";

// Hàng chờ đọc file menu (trang Bulk upload). AI đọc phía sau trên máy chủ, nhân viên đóng trang vẫn chạy:
// - Thêm file vào hàng chờ thì gọi startWorkers() (chạy sau khi trả lời trình duyệt, bằng after()).
// - Mỗi "worker" lấy lần lượt từng file (khóa dòng để hai worker không lấy trùng), đọc, lưu kết quả,
//   tới khi hết file hoặc hết thời gian (WORKER_BUDGET_MS); còn file thì gọi tiếp một worker mới qua /api/menu-jobs/run.
// - Tối đa MAX_ACTIVE file được đọc cùng lúc, để không làm quá tải hạn mức AI dùng chung.
// - Worker bị dừng giữa chừng (máy chủ tắt): file "READING" quá STALE_MS được đưa lại hàng chờ.

export const MAX_ACTIVE = 2;
const MAX_ATTEMPTS = 3;
const STALE_MS = 6 * 60_000;
export const WORKER_BUDGET_MS = 200_000;

/** Lấy một file đang chờ (hoặc bị bỏ dở) và đánh dấu đang đọc. Không còn thì null. */
async function claimNext(): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "MenuJob" SET status = 'READING', "startedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "MenuJob"
      WHERE status = 'QUEUED' OR (status = 'READING' AND "startedAt" < now() - (${STALE_MS} * interval '1 millisecond'))
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`);
  return rows[0]?.id ?? null;
}

/** Đọc một file đã được nhận. Lỗi tạm thời (AI bận) thì cho lại hàng chờ, tối đa MAX_ATTEMPTS lần. */
export async function processJob(jobId: string) {
  const job = await db.menuJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "READING") return;
  const fail = (error: string, retry: boolean) =>
    db.menuJob.update({
      where: { id: job.id },
      data: retry && job.attempts < MAX_ATTEMPTS ? { status: "QUEUED", error } : { status: "FAILED", error, finishedAt: new Date() },
    });
  let bytes: Uint8Array;
  try {
    bytes = await readMenuFile(job.fileKey);
  } catch (e) {
    await fail(e instanceof MenuFileMissingError ? e.message : e instanceof Error && e.message.startsWith("USER:") ? e.message.slice(5) : "Could not open the file", false);
    return;
  }
  try {
    const r = await readMenuForRestaurant(job.restaurantId, { bytes, mime: job.mime });
    if (r.ok) {
      await db.menuJob.update({
        where: { id: job.id },
        data: { status: "READY", result: { categories: r.categories } as unknown as Prisma.InputJsonValue, dishes: r.dishes, error: null, finishedAt: new Date() },
      });
    } else await fail(r.error, r.retry);
  } catch (e) {
    console.error("[menu-jobs] read failed", e instanceof Error ? e.message : e);
    await fail("Something went wrong while reading. Please try again.", true);
  }
}

/** Đọc lần lượt các file trong hàng chờ tới khi hết hoặc hết thời gian. Trả về số file còn chờ. */
export async function runWorker(budgetMs = WORKER_BUDGET_MS): Promise<number> {
  const until = Date.now() + budgetMs;
  while (Date.now() < until) {
    const active = await db.menuJob.count({ where: { status: "READING", startedAt: { gte: new Date(Date.now() - STALE_MS) } } });
    if (active >= MAX_ACTIVE) break; // đủ người đọc rồi
    const id = await claimNext();
    if (!id) break;
    await processJob(id);
  }
  const left = await db.menuJob.count({ where: { status: "QUEUED" } });
  if (left > 0 && Date.now() >= until) await kickRemote();
  return left;
}

/** Bắt đầu đọc phía sau (gọi trong after()): mở tối đa MAX_ACTIVE worker. */
export async function startWorkers() {
  await Promise.all(Array.from({ length: MAX_ACTIVE }, () => runWorker()));
}

/** Gọi một worker mới ở một lần chạy máy chủ khác (mỗi lần chạy có giới hạn thời gian). Cần JOBS_SECRET hoặc REVALIDATE_SECRET. */
export async function kickRemote() {
  const secret = jobsSecret();
  if (!secret) return;
  try {
    await fetch(`${appUrl()}/api/menu-jobs/run`, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(5_000) });
  } catch {
    // trang Bulk upload đang mở cũng tự gọi tiếp khi thấy còn file chờ
  }
}

export const jobsSecret = () => process.env.JOBS_SECRET || process.env.REVALIDATE_SECRET || "";

/** Có file đang chờ mà không ai đọc (worker trước đã dừng)? Dùng để trang Bulk upload gọi tiếp. */
export async function needsWorker(): Promise<boolean> {
  const [queued, active] = await Promise.all([
    db.menuJob.count({ where: { status: "QUEUED" } }),
    db.menuJob.count({ where: { status: "READING", startedAt: { gte: new Date(Date.now() - STALE_MS) } } }),
  ]);
  const stale = await db.menuJob.count({ where: { status: "READING", startedAt: { lt: new Date(Date.now() - STALE_MS) } } });
  return (queued > 0 && active < MAX_ACTIVE) || stale > 0;
}

/** Xóa file gốc của một file đã thêm vào menu hoặc bị bỏ qua. */
export async function removeJobFile(jobId: string) {
  const job = await db.menuJob.findUnique({ where: { id: jobId }, select: { fileKey: true } });
  if (job) await deleteMenuFile(job.fileKey);
}
