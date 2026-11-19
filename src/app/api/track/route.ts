import { z } from "zod";
import { track } from "@/lib/analytics/record";

// POST /api/track — trang khách gửi lên khi khách mở menu hoặc bấm vào một món.
// Gửi bằng navigator.sendBeacon nên khách không phải chờ.

const body = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("view"),
    slug: z.string().min(1).max(60),
    src: z.string().max(30).nullish(),
    referrer: z.string().max(500).nullish(),
  }),
  z.object({
    type: z.literal("click"),
    slug: z.string().min(1).max(60),
    itemId: z.string().min(1).max(40),
  }),
]);

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 2000) return Response.json({ counted: false }, { status: 413 });
  let parsed;
  try {
    parsed = body.safeParse(JSON.parse(text));
  } catch {
    return Response.json({ counted: false }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ counted: false }, { status: 400 });
  const result = await track(parsed.data, request.headers);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
