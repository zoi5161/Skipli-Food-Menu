"use server";

import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createMenuUpload, deleteMenuFile, isMenuFileMime, isMenuFileOf, type UploadTicket } from "@/lib/menu-files";
import { needsWorker, runWorker, startWorkers } from "@/lib/menu/jobs";
import { findRestaurantFor, isStaff } from "@/lib/restaurant";

// Trang Bulk upload: tải nhiều file menu lên, AI đọc phía sau, nhân viên duyệt sau. Chỉ nhân viên Skipli.

async function staff() {
  const user = await requireUser();
  if (!isStaff(user)) throw new Error("USER:Only the Skipli team can do this");
  return user;
}
const msg = (e: unknown) => (e instanceof Error && e.message.startsWith("USER:") ? e.message.slice(5) : "Something went wrong. Please try again.");

export async function startBulkUpload(input: { restaurantId: string; mime: string; size: number }): Promise<{ ok: true; ticket: UploadTicket } | { ok: false; error: string }> {
  try {
    const user = await staff();
    const restaurant = await findRestaurantFor(user, String(input?.restaurantId ?? ""));
    if (!restaurant) throw new Error("USER:Choose a restaurant for this file");
    if (!isMenuFileMime(input.mime)) throw new Error("USER:Use a PDF, JPG, PNG or WebP file");
    return { ok: true, ticket: await createMenuUpload(restaurant.id, input.mime, Number(input.size)) };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** File đã tải lên kho xong: thêm vào hàng chờ và bắt đầu đọc phía sau. */
export async function queueMenuJob(input: { restaurantId: string; key: string; fileName: string; size: number; mime: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await staff();
    const restaurant = await findRestaurantFor(user, String(input?.restaurantId ?? ""));
    if (!restaurant || !isMenuFileOf(restaurant.id, input.key) || !isMenuFileMime(input.mime)) throw new Error("USER:Upload the file again");
    await db.menuJob.create({
      data: { restaurantId: restaurant.id, fileKey: input.key, fileName: String(input.fileName).slice(0, 200), fileSize: Math.max(0, Number(input.size) | 0), mime: input.mime, createdByEmail: user.email },
    });
    after(() => startWorkers());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export type JobRow = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  fileName: string;
  status: "QUEUED" | "READING" | "READY" | "FAILED" | "APPLIED" | "DISMISSED";
  dishes: number;
  error: string | null;
  createdAt: string;
};

/** Các file gần đây (trang tự gọi lại vài giây một lần khi còn file đang đọc). Còn file chờ mà không ai đọc thì gọi thêm worker. */
export async function listJobs(): Promise<JobRow[]> {
  await staff();
  const jobs = await db.menuJob.findMany({
    where: { status: { not: "DISMISSED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, restaurantId: true, fileName: true, status: true, dishes: true, error: true, createdAt: true, restaurant: { select: { name: true } } },
  });
  if (await needsWorker()) after(() => runWorker());
  return jobs.map((j) => ({
    id: j.id,
    restaurantId: j.restaurantId,
    restaurantName: j.restaurant.name,
    fileName: j.fileName,
    status: j.status,
    dishes: j.dishes,
    error: j.error,
    createdAt: j.createdAt.toISOString(),
  }));
}

export async function retryJob(jobId: string): Promise<{ ok: boolean }> {
  await staff();
  const r = await db.menuJob.updateMany({ where: { id: String(jobId), status: "FAILED" }, data: { status: "QUEUED", attempts: 0, error: null } });
  if (r.count) after(() => startWorkers());
  return { ok: r.count > 0 };
}

export async function dismissJob(jobId: string): Promise<{ ok: boolean }> {
  await staff();
  const job = await db.menuJob.findFirst({ where: { id: String(jobId), status: { in: ["READY", "FAILED", "QUEUED"] } }, select: { id: true, fileKey: true } });
  if (!job) return { ok: false };
  await db.menuJob.update({ where: { id: job.id }, data: { status: "DISMISSED" } });
  after(() => deleteMenuFile(job.fileKey));
  return { ok: true };
}
