import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { qrPng, qrSvg } from "@/lib/qr";

// GET /api/qr?format=svg|png[&download=1]
// Trả mã QR của quán người đang đăng nhập. Có download=1 thì trình duyệt tải file về.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });

  const restaurant = await db.restaurant.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  });
  if (!restaurant) return new Response("No restaurant yet", { status: 404 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  const download = url.searchParams.get("download") === "1";
  const filename = `menu-qr-${restaurant.slug}.${format}`;

  const headers: Record<string, string> = {
    "Content-Type": format === "png" ? "image/png" : "image/svg+xml; charset=utf-8",
    // Link quán có thể đổi, nên không để trình duyệt giữ bản cũ.
    "Cache-Control": "private, no-store",
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="${filename}"`;

  if (format === "png") {
    const png = await qrPng(restaurant.slug);
    return new Response(new Uint8Array(png), { headers });
  }
  return new Response(await qrSvg(restaurant.slug), { headers });
}
