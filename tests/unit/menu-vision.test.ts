import { afterEach, describe, expect, it, vi } from "vitest";
import { MenuReadError, parseMenuJson, readMenuPhoto, toCents } from "@/lib/ai/menu-vision";

// Theo hướng dẫn trong .claude/skills/skipli-ai/SKILL.md: giả lập fetch, không gọi AI thật.

const PHO_MENU = {
  categories: [
    {
      name: "Phở",
      items: [
        { name: "Phở Tái", description: "Rare steak, rice noodles, beef broth", price: null, variants: [{ name: "Regular", price: 13.5 }, { name: "Large", price: 15.5 }] },
        { name: "Gỏi Cuốn", description: null, price: "$6.50", variants: [] },
      ],
    },
  ],
};
const geminiReply = (obj: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const groqReply = (text: string) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200 });
const img = { bytes: new Uint8Array([1, 2, 3]), mime: "image/jpeg" };

afterEach(() => vi.unstubAllEnvs());

describe("toCents / parseMenuJson", () => {
  it("đổi giá sang cent", () => {
    expect(toCents(12.5)).toBe(1250);
    expect(toCents("$6.50")).toBe(650);
    expect(toCents(null)).toBeNull();
    expect(toCents(0)).toBeNull();
    expect(toCents("free")).toBeNull();
  });
  it("đọc JSON của AI: món, giá, cỡ; bỏ món không tên; JSON hỏng thì trả rỗng", () => {
    const cats = parseMenuJson("```json\n" + JSON.stringify(PHO_MENU) + "\n```");
    expect(cats).toEqual([
      {
        name: "Phở",
        items: [
          { name: "Phở Tái", description: "Rare steak, rice noodles, beef broth", priceCents: null, variants: [{ name: "Regular", priceCents: 1350 }, { name: "Large", priceCents: 1550 }] },
          { name: "Gỏi Cuốn", description: null, priceCents: 650, variants: [] },
        ],
      },
    ]);
    expect(parseMenuJson('{"categories":[{"name":"Tacos","items":[{"name":""},{"name":"Al Pastor","price":4}]}]}')[0].items).toHaveLength(1);
    expect(parseMenuJson("sorry, I can't read this")).toEqual([]);
  });
  it("nhận cả dạng danh sách món phẳng có 'category'", () => {
    const cats = parseMenuJson(JSON.stringify([{ name: "Horchata", price: 3.5, category: "Drinks" }, { name: "Al Pastor Taco", price: 4, category: "Tacos" }]));
    expect(cats.map((c) => c.name)).toEqual(["Drinks", "Tacos"]);
  });
});

describe("readMenuPhoto", () => {
  it("không có key thì báo no-key; file lạ thì bad-image", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    await expect(readMenuPhoto(img)).rejects.toMatchObject({ reason: "no-key" });
    vi.stubEnv("GEMINI_API_KEY", "g-key");
    await expect(readMenuPhoto({ ...img, mime: "application/pdf" })).rejects.toBeInstanceOf(MenuReadError);
  });

  it("gọi Gemini, key nằm ở header (không ở link)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g-secret");
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchFn = vi.fn().mockResolvedValue(geminiReply(PHO_MENU));
    const r = await readMenuPhoto(img, { fetchFn });
    expect(r.engine).toBe("gemini");
    expect(r.categories[0].items).toHaveLength(2);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).not.toContain("g-secret");
    expect(init.headers["x-goog-api-key"]).toBe("g-secret");
  });

  it("biến GEMINI_IMAGE_MODELS để trống thì vẫn dùng model mặc định (lỗi đã sửa so với bản kit)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GEMINI_IMAGE_MODELS", "");
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchFn = vi.fn().mockResolvedValue(geminiReply(PHO_MENU));
    await readMenuPhoto(img, { fetchFn });
    expect(fetchFn.mock.calls[0][0]).toContain("/models/gemini-flash-latest:generateContent");
  });

  it("Gemini quá tải (503) thì thử model kế, rồi sang Groq", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GEMINI_IMAGE_MODELS", "m1,m2");
    vi.stubEnv("GROQ_API_KEY", "q");
    vi.stubEnv("GROQ_VISION_MODEL", "");
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response("quota", { status: 429 }))
      .mockResolvedValueOnce(groqReply("<think>hmm</think>" + JSON.stringify(PHO_MENU)));
    const r = await readMenuPhoto(img, { fetchFn });
    expect(r.engine).toBe("groq");
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(JSON.parse(fetchFn.mock.calls[2][1].body).model).toBe("qwen/qwen3.8-27b");
  });

  it("model treo (không trả lời) thì bỏ sau thời gian chờ, chuyển model kế", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GEMINI_IMAGE_MODELS", "slow,fast");
    vi.stubEnv("GROQ_API_KEY", "");
    // Model "slow" chỉ dừng khi bị hủy (giống gemini-3.8-flash treo khi thử thật)
    const hang = (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "TimeoutError"))));
    const fetchFn = vi.fn((url: string, init: RequestInit) => (url.includes("/models/slow:") ? hang(url, init) : Promise.resolve(geminiReply(PHO_MENU))));
    const t0 = Date.now();
    const r = await readMenuPhoto(img, { fetchFn: fetchFn as unknown as typeof fetch, timeouts: { geminiModelMs: 200, geminiTotalMs: 2000 } });
    expect(r.categories[0].items).toHaveLength(2);
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("không AI nào trả lời thì báo unavailable", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GEMINI_IMAGE_MODELS", "m1");
    vi.stubEnv("GROQ_API_KEY", "");
    const fetchFn = vi.fn().mockResolvedValue(new Response("busy", { status: 503 }));
    await expect(readMenuPhoto(img, { fetchFn })).rejects.toMatchObject({ reason: "unavailable" });
  });
});
