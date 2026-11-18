import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// Đăng nhập bằng link gửi qua email (không mật khẩu).
// - Link chỉ dùng được 1 lần, hết hạn sau 15 phút.
// - Database chỉ lưu mã băm của link và của phiên, nên lộ database cũng không đăng nhập được.

const SESSION_COOKIE = "sfm_session";
const SESSION_DAYS = 30;
const LOGIN_TOKEN_MINUTES = 15;
const MAX_LINKS_PER_15_MIN = 5;

function newToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3300").replace(/\/$/, "");
}

/**
 * Tạo link đăng nhập cho email. Trả về link (để màn hình dev hiện ra);
 * ở bản chạy thật, link chỉ được gửi qua email (Phase 6).
 */
export async function createLoginLink(
  rawEmail: string,
): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);

  const since = new Date(Date.now() - 15 * 60 * 1000);
  const recent = await db.loginToken.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= MAX_LINKS_PER_15_MIN) {
    return { ok: false, error: "Too many sign-in links. Please wait a few minutes and try again." };
  }

  const token = newToken();
  await db.loginToken.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60 * 1000),
    },
  });

  const link = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`;
  await sendLoginEmail(email, link);
  return { ok: true, link };
}

async function sendLoginEmail(email: string, link: string) {
  // TODO Phase 6: gửi email thật (Resend). Hiện chỉ in ra terminal khi chạy trên máy.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[login] Sign-in link for ${email}:\n${link}\n`);
  }
}

/** Dùng link đăng nhập: đánh dấu đã dùng, tạo tài khoản nếu chưa có, tạo phiên và đặt cookie. */
export async function consumeLoginToken(token: string): Promise<boolean> {
  const record = await db.loginToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return false;

  // Đánh dấu đã dùng; điều kiện usedAt = null chặn trường hợp bấm 2 lần cùng lúc.
  const claimed = await db.loginToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return false;

  const user = await db.user.upsert({
    where: { email: record.email },
    update: {},
    create: { email: record.email },
  });

  const sessionToken = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash: hashToken(sessionToken), userId: user.id, expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

export type CurrentUser = { id: string; email: string; name: string | null };

/** Người đang đăng nhập, hoặc null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Bắt buộc đăng nhập; chưa đăng nhập thì chuyển về /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}
