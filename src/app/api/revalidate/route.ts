import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";

// Xóa lưu đệm trang menu của một quán theo yêu cầu từ bản chạy trên máy dùng chung database
// (xem src/lib/menu/expire.ts). Phải gửi kèm "Authorization: Bearer <REVALIDATE_SECRET>";
// không cài REVALIDATE_SECRET thì đường này luôn từ chối.
// Chỉ nhận đúng dạng nhãn của app ("restaurant:<id>", "slug:<link quán>"), tối đa 10 nhãn mỗi lần.

const TAG = /^(restaurant|slug):[a-z0-9-]{1,80}$/;
const Body = z.object({ tags: z.array(z.string().regex(TAG)).min(1).max(10) });

function authorized(header: string | null, secret: string): boolean {
  const got = Buffer.from(header ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const text = await request.text();
  if (text.length > 2_000) return Response.json({ ok: false, error: "Too large" }, { status: 413 });
  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(text));
  } catch {
    return Response.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ ok: false, error: "Bad tags" }, { status: 400 });
  // expire: 0 → lần mở menu kế tiếp đọc dữ liệu mới, không trả bản cũ
  for (const tag of parsed.data.tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, revalidated: parsed.data.tags.length });
}
