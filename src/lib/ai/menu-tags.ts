// AI gợi ý nhãn chế độ ăn (Vegetarian, Spicy…) và chất gây dị ứng cho các món, chỉ dựa vào tên + mô tả món.
// Cùng cách gọi AI với menu-vision.ts: Gemini trước (trả JSON), Groq khi Gemini bận. Chỉ là GỢI Ý:
// nhân viên xem lại và bỏ tick trước khi lưu. Không chắc thì AI không gợi ý.
//
// Server only. Env: GEMINI_API_KEY và/hoặc GROQ_API_KEY (dùng chung với phần đọc menu).
import "server-only";
import { DIETARY_TAGS, type DietaryTagValue } from "@/lib/menu/format";

export type TagDish = { id: string; name: string; description: string | null; category: string };
export type TagSuggestion = { id: string; tags: DietaryTagValue[]; allergens: string[] };

/** Chất gây dị ứng phổ biến ở Mỹ (9 nhóm chính theo FDA). */
export const COMMON_ALLERGENS = ["Gluten", "Dairy", "Eggs", "Tree nuts", "Peanuts", "Soy", "Fish", "Shellfish", "Sesame"] as const;
// Tên khác AI hay dùng → tên chuẩn ở trên
const ALIASES: Record<string, string> = { milk: "Dairy", wheat: "Gluten", egg: "Eggs", nuts: "Tree nuts", "tree nut": "Tree nuts", peanut: "Peanuts", crustacean: "Shellfish", shellfish: "Shellfish", sesame: "Sesame", soya: "Soy" };

const BATCH = 60;
const GEMINI_MODELS = () => (process.env.GEMINI_TEXT_MODELS || "gemini-flash-lite-latest,gemini-flash-latest").split(",").map((m) => m.trim()).filter(Boolean);
const groqModel = () => process.env.GROQ_TEXT_MODEL || process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

export class TagError extends Error {
  readonly reason: "no-key" | "unavailable";
  constructor(message: string, reason: "no-key" | "unavailable") {
    super(message);
    this.reason = reason;
  }
}

function prompt(dishes: TagDish[], allergenNames: string[]) {
  const allergens = [...new Set([...allergenNames, ...COMMON_ALLERGENS])];
  return [
    "You label restaurant dishes for a US online menu. For each dish below, using ONLY its name, category and description, return JSON:",
    '{"items":[{"id":"<id>","tags":["VEGETARIAN"],"allergens":["Dairy"]}]}',
    `- tags: zero or more of ${DIETARY_TAGS.join(", ")}. VEGETARIAN = no meat or fish. VEGAN = no animal products at all. SPICY only when the name or description says so (chili, jalapeño, hot, spicy…). GLUTEN_FREE, DAIRY_FREE, NUT_FREE, HALAL only when the dish says so.`,
    `- allergens: the allergens the dish clearly contains, using these names: ${allergens.join(", ")}. Bread, tortillas, pasta, pizza crust, batter → Gluten. Cheese, cream, butter, milk → Dairy.`,
    "- When unsure, leave it out. Never guess from the restaurant type. Drinks with nothing special get empty lists.",
    "- Reply with the JSON only.",
    "",
    "Dishes:",
    ...dishes.map((d) => JSON.stringify({ id: d.id, name: d.name, category: d.category, description: d.description ?? "" })),
  ].join("\n");
}

/** Kết quả AI (JSON) → gợi ý sạch: chỉ id có trong danh sách, nhãn hợp lệ, tên dị ứng đã chuẩn hóa. */
export function parseTagJson(text: string, ids: Set<string>, allergenNames: string[]): TagSuggestion[] {
  const raw = String(text ?? "").replace(/```[a-z]*\n?/gi, "").replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  // Tên quán đang dùng được ưu tiên hơn tên chuẩn (đứng sau nên ghi đè)
  const known = new Map([...COMMON_ALLERGENS, ...allergenNames].map((n) => [n.toLowerCase(), n]));
  const allergenName = (v: unknown) => {
    if (typeof v !== "string") return null;
    const k = v.trim().toLowerCase();
    return known.get(k) ?? (ALIASES[k] ? (known.get(ALIASES[k].toLowerCase()) ?? ALIASES[k]) : null);
  };
  const items = Array.isArray((data as { items?: unknown })?.items) ? (data as { items: unknown[] }).items : [];
  const out: TagSuggestion[] = [];
  for (const it of items) {
    const o = it as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    if (!ids.has(id)) continue;
    const tags = (Array.isArray(o.tags) ? o.tags : []).filter((t): t is DietaryTagValue => (DIETARY_TAGS as readonly string[]).includes(t as string));
    const allergens = (Array.isArray(o.allergens) ? o.allergens : []).map(allergenName).filter((n): n is string => Boolean(n));
    // VEGAN thì cũng là VEGETARIAN; món có Dairy không thể DAIRY_FREE…
    const t = new Set(tags);
    if (t.has("VEGAN")) t.add("VEGETARIAN");
    const a = new Set(allergens);
    // Có cá / hải sản thì không chay; có sữa / trứng thì không thuần chay
    if (a.has("Fish") || a.has("Shellfish")) {
      t.delete("VEGETARIAN");
      t.delete("VEGAN");
    }
    if (a.has("Dairy") || a.has("Eggs")) t.delete("VEGAN");
    if (a.has("Dairy")) t.delete("DAIRY_FREE");
    if (a.has("Gluten")) t.delete("GLUTEN_FREE");
    if (a.has("Tree nuts") || a.has("Peanuts")) t.delete("NUT_FREE");
    if (t.size || a.size) out.push({ id, tags: DIETARY_TAGS.filter((x) => t.has(x)), allergens: [...a] });
  }
  return out;
}

async function askOnce(text: string, fetchFn: typeof fetch): Promise<string | null> {
  const gemini = process.env.GEMINI_API_KEY;
  for (const model of gemini ? GEMINI_MODELS() : []) {
    try {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "x-goog-api-key": gemini! },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text }] }], generationConfig: { maxOutputTokens: 8000, temperature: 0, responseMimeType: "application/json" } }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const out = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (out) return out;
    } catch {
      // model kế / Groq
    }
  }
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    try {
      const res = await fetchFn(`${process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1"}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${groq}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: groqModel(), max_tokens: 8000, temperature: 0, reasoning_effort: "none", messages: [{ role: "user", content: text }] }),
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return String((await res.json()).choices?.[0]?.message?.content ?? "");
    } catch {
      // hết cách
    }
  }
  return null;
}

/** Gợi ý cho cả danh sách món (chia nhóm 60 món mỗi lần hỏi). Chỉ trả về món có gợi ý. */
export async function suggestTags(dishes: TagDish[], allergenNames: string[], { fetchFn = fetch }: { fetchFn?: typeof fetch } = {}): Promise<{ items: TagSuggestion[]; engine: string }> {
  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) throw new TagError("Set GEMINI_API_KEY or GROQ_API_KEY", "no-key");
  const out: TagSuggestion[] = [];
  let answered = false;
  for (let i = 0; i < dishes.length; i += BATCH) {
    const chunk = dishes.slice(i, i + BATCH);
    const text = await askOnce(prompt(chunk, allergenNames), fetchFn);
    if (text === null) continue;
    answered = true;
    out.push(...parseTagJson(text, new Set(chunk.map((d) => d.id)), allergenNames));
  }
  if (!answered && dishes.length) throw new TagError("The AI is busy, try again in a minute", "unavailable");
  return { items: out, engine: "ai" };
}
