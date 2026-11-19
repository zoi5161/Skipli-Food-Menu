import { db } from "@/lib/db";

// Dọn dữ liệu mỗi ngày (Vercel Cron gọi, xem vercel.json). Vercel tự gửi kèm
// "Authorization: Bearer <CRON_SECRET>"; người ngoài gọi vào sẽ bị từ chối.
// - Link đăng nhập và phiên đã hết hạn
// - Muối băm mã khách cũ hơn 2 ngày (để không nối được khách qua nhiều ngày)
// - Lượt xem / lượt bấm chi tiết cũ hơn 400 ngày (trang Stats chỉ cần tối đa 180 ngày)

const RETENTION_DAYS = 400;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const now = Date.now();
  const day = 86_400_000;
  const oldEvents = new Date(now - RETENTION_DAYS * day);
  const twoDaysAgo = new Date(now - 2 * day).toISOString().slice(0, 10);
  const [tokens, sessions, salts, views, clicks] = await Promise.all([
    db.loginToken.deleteMany({ where: { expiresAt: { lt: new Date(now - day) } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.dailySalt.deleteMany({ where: { day: { lt: twoDaysAgo } } }),
    db.pageView.deleteMany({ where: { createdAt: { lt: oldEvents } } }),
    db.itemClick.deleteMany({ where: { createdAt: { lt: oldEvents } } }),
  ]);
  const removed = { loginTokens: tokens.count, sessions: sessions.count, salts: salts.count, pageViews: views.count, itemClicks: clicks.count };
  console.log("[cron] cleanup", JSON.stringify(removed));
  return Response.json({ ok: true, removed });
}
