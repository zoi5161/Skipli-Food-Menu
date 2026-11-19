#!/usr/bin/env node
// Chạy thử tải: giả lập nhiều khách cùng mở trang menu và gửi lượt xem.
// Không cần thư viện. Ví dụ:
//   node scripts/load-test.mjs --url http://localhost:3310 --slug lantern-and-ladle --seconds 20 --concurrency 50
//   node scripts/load-test.mjs --url https://ten-app.vercel.app --mode page
// --mode page   chỉ mở trang menu
// --mode track  chỉ gửi lượt xem (/api/track). Lượt xem test có nguồn "loadtest.local" để dễ xóa sau.
// --mode both   cả hai (mặc định)

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const BASE = (args.url ?? "http://localhost:3310").replace(/\/$/, "");
const SLUG = args.slug ?? "lantern-and-ladle";
const SECONDS = Number(args.seconds ?? 20);
const CONCURRENCY = Number(args.concurrency ?? 50);
const MODE = args.mode ?? "both";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const results = { page: [], track: [] };
const errors = { page: 0, track: 0 };
const deadline = Date.now() + SECONDS * 1000;
let n = 0;

async function hit(kind) {
  const started = performance.now();
  try {
    const ip = `198.18.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const res =
      kind === "page"
        ? await fetch(`${BASE}/@${SLUG}`, { headers: { "user-agent": UA } })
        : await fetch(`${BASE}/api/track`, {
            method: "POST",
            headers: { "content-type": "text/plain", "user-agent": UA, "x-forwarded-for": ip },
            body: JSON.stringify({ type: "view", slug: SLUG, referrer: "https://loadtest.local/" }),
          });
    await res.arrayBuffer();
    if (!res.ok) errors[kind]++;
    else results[kind].push(performance.now() - started);
  } catch {
    errors[kind]++;
  }
}

async function worker() {
  while (Date.now() < deadline) {
    const kind = MODE === "both" ? (n++ % 2 === 0 ? "page" : "track") : MODE;
    await hit(kind);
  }
}

const pct = (arr, p) => {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

console.log(`Load test: ${BASE}/@${SLUG}, ${CONCURRENCY} guests at once, ${SECONDS}s, mode=${MODE}`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

for (const kind of ["page", "track"]) {
  const r = results[kind];
  if (r.length === 0 && errors[kind] === 0) continue;
  console.log(
    `${kind === "page" ? "Menu page " : "Track view"}: ${r.length} ok, ${errors[kind]} errors, ` +
      `${(r.length / SECONDS).toFixed(0)}/s, median ${pct(r, 50).toFixed(0)} ms, p95 ${pct(r, 95).toFixed(0)} ms, max ${pct(r, 100).toFixed(0)} ms`,
  );
}
