import { afterEach, describe, expect, it, vi } from "vitest";
import { loginEmail, sendEmail } from "@/lib/email";

const msg = { to: "owner@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("gửi qua Resend với khóa và người gửi trong .env", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "Skipli Menu <login@example.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendEmail(msg)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");
    expect(JSON.parse(init.body)).toMatchObject({ from: "Skipli Menu <login@example.com>", to: ["owner@example.com"], subject: "Hi" });
  });

  it("Resend báo lỗi hoặc không gọi được thì trả lỗi, không in khóa ra log", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_secret_value");
    vi.stubEnv("EMAIL_FROM", "x@example.com");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("domain not verified", { status: 403 })));
    expect(await sendEmail(msg)).toEqual({ ok: false, error: "Email service error" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await sendEmail(msg)).toEqual({ ok: false, error: "Email service unreachable" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("re_secret_value");
  });

  it("chưa có khóa: chạy trên máy thì bỏ qua, chạy thật thì báo lỗi", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    expect(await sendEmail(msg)).toEqual({ ok: true });
    vi.stubEnv("NODE_ENV", "production");
    expect(await sendEmail(msg)).toEqual({ ok: false, error: "Email isn't set up yet" });
  });
});

describe("loginEmail", () => {
  it("có link, thời hạn, bản chữ thường; chống chèn mã vào HTML", () => {
    const e = loginEmail('https://x.test/auth/verify?token=a"b<c', 15);
    expect(e.subject).toBe("Your sign-in link for Skipli Menu");
    expect(e.text).toContain('https://x.test/auth/verify?token=a"b<c');
    expect(e.text).toContain("expires in 15 minutes");
    expect(e.html).toContain("token=a&quot;b&lt;c");
    expect(e.html).not.toContain('a"b<c');
  });
});
