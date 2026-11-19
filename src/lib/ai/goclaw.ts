// Client for the team's shared GoClaw gateway (the same one Skipli Content uses:
// skipli-content-skills/web/server/goclaw.mjs). GoClaw exposes an OpenAI-style endpoint;
// `model` is "goclaw:<agent_key>" and the agent runs its own skills/tools before answering.
//
// Server only. Env: GOCLAW_URL, GOCLAW_GATEWAY_TOKEN, GOCLAW_USER_ID (default "system").
// GoClaw sends no headers until the agent has finished, which can take minutes. Node's fetch gives up
// after 300 s without headers, so long agent runs need node:http (as Skipli Content does), and a
// serverless function needs a maxDuration long enough for the run.

// Chép từ ~/Downloads/skipli-ai-kit/lib/goclaw.ts. Hiện chưa dùng: GoClaw chỉ có trong mạng nội bộ công ty.
import "server-only";

export type GoclawMessage = { role: "system" | "user" | "assistant"; content: string };

export function goclawConfigured() {
  return !!(process.env.GOCLAW_URL && process.env.GOCLAW_GATEWAY_TOKEN);
}

export async function goclawChat(
  { agent, messages, timeoutMs = 120_000, signal }: { agent: string; messages: GoclawMessage[]; timeoutMs?: number; signal?: AbortSignal },
): Promise<{ content: string; usage: unknown }> {
  const url = process.env.GOCLAW_URL;
  const token = process.env.GOCLAW_GATEWAY_TOKEN;
  if (!url || !token) throw new Error("Set GOCLAW_URL and GOCLAW_GATEWAY_TOKEN");
  const res = await fetch(new URL("/v1/chat/completions", url), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GoClaw-User-Id": process.env.GOCLAW_USER_ID || "system",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ model: `goclaw:${agent}`, messages, stream: false }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`GoClaw ${res.status}: ${JSON.stringify(json?.error ?? json ?? "").slice(0, 300)}`);
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("GoClaw returned an empty answer");
  return { content, usage: json.usage ?? null };
}

export async function goclawHealth(): Promise<boolean> {
  if (!goclawConfigured()) return false;
  try {
    const res = await fetch(new URL("/health", process.env.GOCLAW_URL), { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
