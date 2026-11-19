// Gửi lượt xem / lượt bấm món về máy chủ, không làm chậm trang (sendBeacon chạy nền).
// Máy chủ tự lọc bot, chủ quán, lượt trùng; ở đây chỉ gửi.

function send(payload: object) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) return;
  } catch {
    // trình duyệt không cho sendBeacon: dùng fetch bên dưới
  }
  fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
}

const sentViews = new Set<string>();

/** Gọi một lần khi trang menu mở. Xong thì bỏ ?src=… khỏi thanh địa chỉ để link khách chia sẻ lại không bị tính là "quét QR". */
export function trackView(slug: string) {
  if (sentViews.has(slug)) return; // React chạy effect 2 lần khi dev
  sentViews.add(slug);
  const url = new URL(location.href);
  const src = url.searchParams.get("src");
  send({ type: "view", slug, src, referrer: document.referrer || null });
  if (src) {
    url.searchParams.delete("src");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
}

export function trackClick(slug: string, itemId: string) {
  send({ type: "click", slug, itemId });
}
