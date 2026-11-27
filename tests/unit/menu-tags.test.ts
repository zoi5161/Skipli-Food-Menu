import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTagJson, suggestTags } from "@/lib/ai/menu-tags";

afterEach(() => vi.unstubAllEnvs());

describe("đọc gợi ý nhãn của AI", () => {
  const ids = new Set(["a", "b", "c"]);
  it("chỉ giữ món có trong danh sách, nhãn hợp lệ, tên dị ứng chuẩn", () => {
    const text = JSON.stringify({
      items: [
        { id: "a", tags: ["VEGAN", "SPICY", "KETO"], allergens: ["wheat", "Soy"] },
        { id: "b", tags: ["DAIRY_FREE", "GLUTEN_FREE"], allergens: ["milk", "Cheese?"] },
        { id: "zzz", tags: ["VEGAN"], allergens: [] },
        { id: "c", tags: [], allergens: [] },
      ],
    });
    expect(parseTagJson("```json\n" + text + "\n```", ids, ["Gluten (wheat)"])).toEqual([
      { id: "a", tags: ["VEGETARIAN", "VEGAN", "SPICY"], allergens: ["Gluten", "Soy"] },
      // có Dairy thì bỏ "Dairy-free" (AI tự mâu thuẫn); tên lạ bị bỏ
      { id: "b", tags: ["GLUTEN_FREE"], allergens: ["Dairy"] },
    ]);
  });
  it("dùng đúng tên dị ứng quán đang dùng (không phân biệt hoa thường)", () => {
    expect(parseTagJson('{"items":[{"id":"a","tags":[],"allergens":["shellfish"]}]}', ids, ["Shellfish (shrimp, crab)", "SHELLFISH"])[0].allergens).toEqual(["SHELLFISH"]);
  });
  it("bỏ nhãn chay khi có cá / hải sản, bỏ thuần chay khi có sữa / trứng", () => {
    const r = parseTagJson('{"items":[{"id":"a","tags":["VEGETARIAN"],"allergens":["Fish","Dairy"]},{"id":"b","tags":["VEGAN"],"allergens":["Eggs"]}]}', ids, []);
    expect(r).toEqual([
      { id: "a", tags: [], allergens: ["Fish", "Dairy"] },
      { id: "b", tags: ["VEGETARIAN"], allergens: ["Eggs"] },
    ]);
  });
  it("JSON hỏng thì không gợi ý gì", () => {
    expect(parseTagJson("sorry", ids, [])).toEqual([]);
  });
});

describe("suggestTags", () => {
  it("chia nhóm 60 món, Gemini bận thì sang Groq", async () => {
    vi.stubEnv("GEMINI_API_KEY", "g");
    vi.stubEnv("GROQ_API_KEY", "q");
    vi.stubEnv("GEMINI_TEXT_MODELS", "m1");
    const dishes = Array.from({ length: 61 }, (_, i) => ({ id: `d${i}`, name: `Dish ${i}`, description: null, category: "Mains" }));
    const fetchFn = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("generativelanguage")) {
        const body = JSON.parse(init.body as string);
        const id = body.contents[0].parts[0].text.includes('"d60"') ? "d60" : "d0";
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items: [{ id, tags: ["SPICY"], allergens: [] }] }) }] } }] }));
      }
      return new Response("{}");
    });
    const r = await suggestTags(dishes, [], { fetchFn: fetchFn as unknown as typeof fetch });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(r.items.map((x) => x.id)).toEqual(["d0", "d60"]);
  });
  it("không có key thì báo no-key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    await expect(suggestTags([], [])).rejects.toMatchObject({ reason: "no-key" });
  });
});
