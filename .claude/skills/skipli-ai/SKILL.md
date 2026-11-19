---
name: skipli-ai
description: How this repo uses the AI shared with Skipli Content (GoClaw gateway, Gemini, Groq). Use before writing any code that calls an AI model, reads a menu photo, or talks to GoClaw, and when setting AI environment variables.
---

# Shared AI with Skipli Content

This repo shares its AI setup with the sister project **skipli-content-skills** (Skipli Content). Reuse the
same services, keys and patterns; do not add a new AI provider without asking the user.

## What is shared

| Service | What it is for | Env vars |
|---|---|---|
| **Gemini API** (Google) | Reading images: menu photos, dish photos. Free tier, fast. First choice for vision. | `GEMINI_API_KEY`, optional `GEMINI_IMAGE_MODELS` (default `gemini-flash-latest,gemini-3.8-flash,gemini-flash-lite-latest`; Flash often returns 503 "high demand", Flash-Lite is the safety net) |
| **Groq** (OpenAI-compatible) | Fallback vision model when Gemini is busy or over quota; fast text writing. | `GROQ_API_KEY`, optional `GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`), `GROQ_API_BASE` |
| **GoClaw gateway** | The team's agent server (runs agents with skills and tools: web scraping, browser, read_image). Slow (seconds to minutes) and runs on the company server, not on Vercel. | `GOCLAW_URL`, `GOCLAW_GATEWAY_TOKEN`, `GOCLAW_USER_ID` (default `system`) |

Keys live only in `.env` (local) and Vercel → Settings → Environment Variables. Never hardcode a key, never
print one, never ask the user to paste one in chat. The user copies values from
`skipli-content-skills/deploy/.env` themselves.

## Reading a menu photo

Use `src/lib/ai/menu-vision.ts` → `readMenuPhoto({ bytes, mime })`. It calls Gemini directly (JSON output),
tries the next Gemini model on 429/503, then Groq. It returns
`{ categories: [{ name, items: [{ name, description, priceCents, variants: [{ name, priceCents }] }] }], engine }`,
which maps straight onto Prisma `Category`, `MenuItem` (+ `ItemVariant` when `variants` is non-empty).

Rules that come from Skipli Content's experience:
- Copy names and prices exactly as printed; never invent dishes, prices or descriptions. Blurry text is skipped.
- The owner always reviews the result before it is saved (show an editable preview, then save).
- Accept JPG, PNG, WebP. Resize large phone photos first (the repo has `src/lib/resize-image.ts`); Groq refuses
  base64 over 4 MB.
- Pass the Gemini key in the `x-goog-api-key` header, not `?key=` (newer "AQ." keys are refused in the URL).
- `MenuReadError.reason`: `no-key` → AI not configured, `bad-image` → wrong file type, `unavailable` → busy, retry.
- Call it from a Route Handler or Server Action only (keys are server secrets). Set `export const maxDuration = 60`.

Do NOT route menu photo reading through GoClaw: Vercel cannot reach the GoClaw server (it is only on the company
server's private network), and a full agent run is much slower than one Gemini call.

## Calling GoClaw (only when an agent is really needed)

`src/lib/ai/goclaw.ts` → `goclawChat({ agent, messages })`. Endpoint `POST {GOCLAW_URL}/v1/chat/completions`,
body `{ model: "goclaw:<agent_key>", messages, stream: false }`, headers `Authorization: Bearer <token>` and
`X-GoClaw-User-Id`. Existing agents: `content-scout` (scans pages, reads video/images), `content-writer`.
GoClaw answers only when the agent finishes (minutes); Node fetch aborts after 300 s without headers, so long
runs need `node:http` and a background job, not a request the user waits on. Before using GoClaw from this
repo, ask the user how it will be reached (public HTTPS URL + token on the server); it is not exposed today.

## Testing

Mock `fetch` in unit tests (vitest): Gemini reply shape is
`{ candidates: [{ content: { parts: [{ text: "<json>" }] } }] }`; Groq/GoClaw reply shape is
`{ choices: [{ message: { content: "<text>" } }] }`. Test `parseMenuJson` and `toCents` directly.
