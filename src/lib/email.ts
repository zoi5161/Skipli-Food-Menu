import "server-only";

// Gửi email qua Resend (https://resend.com), gọi thẳng API của họ, không cần thư viện.
// Cần 2 biến trong .env (chủ dự án tự điền, không dán vào chat):
//   RESEND_API_KEY  khóa API của Resend
//   EMAIL_FROM      người gửi, ví dụ "Skipli Menu <login@ten-mien-cua-ban.com>"
// Chưa có khóa: khi chạy trên máy thì chỉ in ra terminal; khi chạy thật thì báo lỗi rõ ràng.

export type EmailResult = { ok: true } | { ok: false; error: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<EmailResult> {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email] (not sent, no RESEND_API_KEY) To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
      return { ok: true };
    }
    console.error("[email] RESEND_API_KEY or EMAIL_FROM is missing");
    return { ok: false, error: "Email isn't set up yet" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      // Không in khóa API; chỉ in mã lỗi và nội dung Resend trả về
      console.error(`[email] Resend error ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { ok: false, error: "Email service error" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] Resend request failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Email service unreachable" };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Email chứa link đăng nhập (tiếng Anh, cho chủ quán ở Mỹ). */
export function loginEmail(link: string, minutes: number) {
  const subject = "Your sign-in link for Skipli Menu";
  const text = [
    "Hi,",
    "",
    "Use this link to sign in to Skipli Menu:",
    link,
    "",
    `The link works once and expires in ${minutes} minutes.`,
    "If you didn't ask to sign in, you can ignore this email.",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:18px;font-weight:700"><img src="${esc(new URL("/assets/skipli-logo2-512.png", link).toString())}" alt="" width="28" height="28" style="vertical-align:middle;margin-right:8px">Skipli <span style="color:#1f4fae">Menu</span></td></tr>
<tr><td style="padding-top:24px;font-size:16px;line-height:24px">Tap the button to sign in. The link works once and expires in ${minutes} minutes.</td></tr>
<tr><td style="padding-top:24px"><a href="${esc(link)}" style="display:inline-block;background:#1f4fae;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">Sign in to Skipli Menu</a></td></tr>
<tr><td style="padding-top:24px;font-size:13px;line-height:20px;color:#737373">If the button doesn't work, copy this link into your browser:<br><span style="word-break:break-all;color:#404040">${esc(link)}</span></td></tr>
<tr><td style="padding-top:24px;font-size:13px;color:#737373">If you didn't ask to sign in, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
