// Read a photo of a printed menu or price board into structured dishes, the same way Skipli Content does it
// (skipli-content-skills/web/server/vision.mjs → readMenu): Gemini first, a vision model on Groq when Gemini
// is busy, over quota or silent. Names and prices are copied as printed; nothing is invented.
//
// Server only (Route Handler / Server Action). Env: GEMINI_API_KEY and/or GROQ_API_KEY.
// Optional: GEMINI_IMAGE_MODELS (comma list), GROQ_VISION_MODEL.
//
// Chép từ ~/Downloads/skipli-ai-kit/lib/menu-vision.ts. Sửa trong repo này:
// - biến môi trường để trống ("") thì dùng mặc định (bản gốc dùng ?? nên "" làm danh sách model Gemini rỗng);
// - đọc biến môi trường lúc gọi hàm (không phải lúc nạp file) để đổi được khi chạy và khi test;
// - giới hạn thời gian: mỗi model Gemini tối đa 25 s, cả lượt Gemini tối đa 40 s, rồi sang model kế / Groq.
//   (Thử thật 20-11-2026: gemini-flash-latest báo 503 sau 5 s, gemini-3.8-flash treo hơn 70 s,
//   flash-lite trả lời trong 4 s, Groq 2 s. Bản kit chờ 60 s mỗi model nên chủ quán có thể chờ vài phút.)
import "server-only";

export type ReadMenuVariant = { name: string; priceCents: number };
export type ReadMenuItem = { name: string; description: string | null; priceCents: number | null; variants: ReadMenuVariant[] };
export type ReadMenuCategory = { name: string; items: ReadMenuItem[] };
export type ReadMenuResult = { categories: ReadMenuCategory[]; engine: "gemini" | "groq" };

// Thứ tự: flash (tốt nhất, hay quá tải) → flash-lite (nhanh, ổn định) → 3.8-flash (hay treo khi thử thật).
// Bản kit để 3.8-flash thứ hai. Muốn đổi thì đặt GEMINI_IMAGE_MODELS trong .env.
const DEFAULT_GEMINI_MODELS = "gemini-flash-latest,gemini-flash-lite-latest,gemini-3.8-flash";
const geminiModels = () => (process.env.GEMINI_IMAGE_MODELS || DEFAULT_GEMINI_MODELS).split(",").map((m) => m.trim()).filter(Boolean);
const groqVisionModel = () => process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";
const GROQ_MAX_BASE64 = 4_000_000; // Groq refuses base64 images over 4 MB
const GEMINI_MODEL_TIMEOUT_MS = 25_000;
const GEMINI_TOTAL_MS = 40_000;
const GROQ_TIMEOUT_MS = 30_000;
export const MENU_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const PDF_MIME = "application/pdf";
const MAX_ITEMS = 150;
// Menu PDF (nhiều trang): chỉ Gemini đọc được PDF (Groq chỉ nhận ảnh), cần nhiều thời gian và chỗ trả lời hơn.
const PDF_MAX_ITEMS = 400;
const PDF_MODEL_TIMEOUT_MS = 60_000;
const PDF_TOTAL_MS = 100_000;
// Gemini nhận file gửi kèm trực tiếp tới ~20 MB mỗi yêu cầu (tính cả mã hóa base64, to hơn file ~33%).
// File lớn hơn mức dưới đây thì tải lên kho file của Gemini trước (Files API) rồi gửi đường dẫn.
const GEMINI_INLINE_MAX_BASE64 = 14_000_000;

export const MENU_PROMPT = [
  "This is a restaurant menu or price board (a photo, or a PDF with one or more pages). Copy EVERY dish you can read, on every page, into JSON, nothing else:",
  '{"categories":[{"name":"Pizza","items":[{"name":"Margherita","description":"Tomato, mozzarella, basil","price":12.5,"variants":[]}]}]}',
  "Rules:",
  "- Category and dish names exactly as printed, in the menu's own language. No categories on the menu: one category named \"Menu\".",
  "- description only when the menu prints one, else null.",
  "- price is a number in the menu's currency (12.5 for $12.50), or null when no price is printed.",
  '- A dish with several sizes or prices: price null and variants like [{"name":"Small","price":10},{"name":"Large","price":14}].',
  "- Text too blurry to read with certainty: leave that dish out. Never guess or invent dishes, prices or descriptions.",
  "- Reply with the JSON only: no explanation, no ```.",
].join("\n");

export class MenuReadError extends Error {
  readonly reason: "no-key" | "bad-image" | "unavailable";
  constructor(message: string, reason: "no-key" | "bad-image" | "unavailable") {
    super(message);
    this.reason = reason;
  }
}

/**
 * @returns the dishes read; `categories` is empty when a model answered but found no dish.
 * @throws MenuReadError without a key, for an unsupported image, or when no model answered.
 */
export async function readMenuPhoto(
  { bytes, mime }: { bytes: Uint8Array | ArrayBuffer; mime: string },
  {
    signal,
    fetchFn = fetch,
    timeouts = {},
  }: { signal?: AbortSignal; fetchFn?: typeof fetch; timeouts?: { geminiModelMs?: number; geminiTotalMs?: number; groqMs?: number } } = {},
): Promise<ReadMenuResult> {
  const gemini = process.env.GEMINI_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  if (!gemini && !groq) throw new MenuReadError("Set GEMINI_API_KEY or GROQ_API_KEY", "no-key");
  const pdf = mime === PDF_MIME;
  if (!pdf && !(MENU_MIME as readonly string[]).includes(mime)) throw new MenuReadError("Use a PDF, JPG, PNG or WebP file", "bad-image");
  if (pdf && !gemini) throw new MenuReadError("Reading PDF menus needs GEMINI_API_KEY", "no-key");
  const maxItems = pdf ? PDF_MAX_ITEMS : MAX_ITEMS;
  const raw = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const base64 = Buffer.from(raw).toString("base64");
  // File lớn: tải lên Gemini một lần, các model dùng chung đường dẫn
  let filePart: { file_data: { mime_type: string; file_uri: string } } | null = null;
  if (gemini && base64.length > GEMINI_INLINE_MAX_BASE64) {
    try {
      filePart = { file_data: { mime_type: mime, file_uri: await geminiUpload(raw, mime, gemini, fetchFn, signal) } };
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new MenuReadError("Could not send the file to the AI", "unavailable");
    }
  }

  let answered = false;
  const modelMs = timeouts.geminiModelMs ?? (pdf ? PDF_MODEL_TIMEOUT_MS : GEMINI_MODEL_TIMEOUT_MS);
  const geminiDeadline = Date.now() + (timeouts.geminiTotalMs ?? (pdf ? PDF_TOTAL_MS : GEMINI_TOTAL_MS));
  // PDF: thử flash-lite trước (thử thật 25-11-2026 với PDF menu: flash-lite đọc đủ 15 món trong 3 s,
  // còn flash và 3.8-flash báo quá tải sau 35–55 s).
  const models = pdf ? [...geminiModels()].sort((x, y) => Number(y.includes("lite")) - Number(x.includes("lite"))) : geminiModels();
  for (const model of gemini ? models : []) {
    const budget = Math.min(modelMs, geminiDeadline - Date.now());
    if (budget < Math.min(3_000, modelMs)) break; // hết thời gian cho Gemini: sang Groq
    try {
      const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        // The key goes in a header: the newer "AQ." keys are refused as ?key=
        headers: { "Content-Type": "application/json; charset=utf-8", "x-goog-api-key": gemini! },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [filePart ?? { inline_data: { mime_type: mime, data: base64 } }, { text: MENU_PROMPT }] }],
          generationConfig: { maxOutputTokens: pdf ? 32000 : 8000, temperature: 0, responseMimeType: "application/json" },
        }),
        signal: anySignal(signal, budget),
      });
      if (!res.ok) continue; // 429 / 503: the next model or Groq takes over
      answered = true;
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      const categories = parseMenuJson(text, maxItems);
      if (categories.length) return { categories, engine: "gemini" };
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  // Groq when Gemini was busy, or answered without a dish it could use (a second opinion is cheap).
  if (groq && !pdf && !filePart && base64.length <= GROQ_MAX_BASE64) {
    try {
      const res = await fetchFn(`${process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1"}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${groq}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqVisionModel(),
          max_tokens: 8000,
          temperature: 0,
          reasoning_effort: "none",
          messages: [{ role: "user", content: [{ type: "text", text: MENU_PROMPT }, { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }] }],
        }),
        signal: anySignal(signal, timeouts.groqMs ?? GROQ_TIMEOUT_MS),
      });
      if (res.ok) {
        const text = String((await res.json()).choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "");
        return { categories: parseMenuJson(text), engine: "groq" };
      }
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }

  if (answered) return { categories: [], engine: "gemini" };
  throw new MenuReadError("The AI is busy, try again in a minute", "unavailable");
}

/** The model's JSON kept to clean categories and dishes (max 150 by default), prices in cents. Bad JSON → []. */
export function parseMenuJson(text: string, maxItems = MAX_ITEMS): ReadMenuCategory[] {
  const raw = String(text ?? "").replace(/```[a-z]*\n?/gi, "");
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (start < 0 || end <= start) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const out: ReadMenuCategory[] = [];
  let count = 0;
  // Models do not always keep the asked shape: accept {categories:[…]}, a bare array of categories,
  // a flat array of dishes that each carry a "category", or (PDF menus) one {categories:[…]} per page.
  const cats_ = (x: unknown) => (Array.isArray((x as { categories?: unknown })?.categories) ? (x as { categories: unknown[] }).categories : null);
  const pages = Array.isArray(data) && data.length > 0 && data.every((x) => cats_(x) !== null) ? data.flatMap((x) => cats_(x)!) : null;
  const list: unknown[] = pages ?? (Array.isArray(data) ? data : (cats_(data) ?? []));
  const flat = list.length > 0 && list.every((x) => x && typeof x === "object" && !Array.isArray((x as { items?: unknown }).items));
  const cats: unknown[] = flat
    ? Object.entries(
        list.reduce<Record<string, unknown[]>>((acc, x) => {
          const key = str((x as Record<string, unknown>).category, 60) || "Menu";
          (acc[key] ??= []).push(x);
          return acc;
        }, {}),
      ).map(([name, items]) => ({ name, items }))
    : list;
  for (const c of cats) {
    const items: ReadMenuItem[] = [];
    for (const it of Array.isArray((c as { items?: unknown }).items) ? (c as { items: unknown[] }).items : []) {
      const o = it as Record<string, unknown>;
      const name = str(o.name, 120);
      if (!name || count >= maxItems) continue;
      const variants = (Array.isArray(o.variants) ? o.variants : [])
        .map((v) => ({ name: str((v as Record<string, unknown>).name, 60), priceCents: toCents((v as Record<string, unknown>).price) }))
        .filter((v): v is ReadMenuVariant => !!v.name && v.priceCents !== null);
      items.push({ name, description: str(o.description, 500) || null, priceCents: variants.length ? null : toCents(o.price), variants });
      count++;
    }
    if (items.length) out.push({ name: str((c as Record<string, unknown>).name, 60) || "Menu", items });
  }
  return out;
}

/** 12.5 / "12.50" / "$12.50" → 1250; anything else → null. */
export function toCents(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 && n < 100_000 ? Math.round(n * 100) : null;
}

/**
 * Tải file lên Gemini (Files API, giao thức "resumable" 2 bước) rồi chờ file sẵn sàng. Trả về file_uri.
 * Gemini tự xóa file sau 48 giờ.
 */
async function geminiUpload(bytes: Uint8Array, mime: string, key: string, fetchFn: typeof fetch, signal?: AbortSignal): Promise<string> {
  const base = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
  const start = await fetchFn(`${base}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "menu" } }),
    signal: anySignal(signal, 30_000),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) throw new Error(`Gemini upload start failed (${start.status})`);
  const done = await fetchFn(uploadUrl, {
    method: "POST",
    headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "Content-Type": mime },
    body: bytes as unknown as BodyInit,
    signal: anySignal(signal, 120_000),
  });
  if (!done.ok) throw new Error(`Gemini upload failed (${done.status})`);
  let file = (await done.json()).file as { name: string; uri: string; state?: string };
  // PDF cần vài giây để Gemini xử lý trước khi dùng được
  for (let i = 0; file.state === "PROCESSING" && i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2_000));
    const res = await fetchFn(`${base}/v1beta/${file.name}`, { headers: { "x-goog-api-key": key }, signal: anySignal(signal, 15_000) });
    if (res.ok) file = await res.json();
  }
  if (file.state && file.state !== "ACTIVE") throw new Error(`Gemini file not ready (${file.state})`);
  return file.uri;
}

function anySignal(signal: AbortSignal | undefined, ms: number) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
}
