import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginEmail, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/site-url";

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

/**
 * Tạo link đăng nhập và gửi qua email. Trả về link để màn hình hiện ra khi chạy trên máy;
 * ở bản chạy thật, link chỉ nằm trong email.
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
  if (process.env.NODE_ENV !== "production") console.log(`\n[login] Sign-in link for ${email}:\n${link}\n`);
  const sent = await sendEmail({ to: email, ...loginEmail(link, LOGIN_TOKEN_MINUTES) });
  if (!sent.ok) {
    // Gửi không được thì xóa link (để không tính vào giới hạn 5 link / 15 phút)
    await db.loginToken.deleteMany({ where: { tokenHash: hashToken(token) } });
    return { ok: false, error: "We couldn't send the email right now. Please try again in a minute." };
  }
  return { ok: true, link };
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
