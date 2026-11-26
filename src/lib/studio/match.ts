// Gợi ý quán cho một file menu theo tên file: "casa-lupita_menu 2026.pdf" → Casa Lupita Taqueria.
// Dùng ở trang Bulk upload (chạy trên trình duyệt). Không chắc thì không gợi ý, để nhân viên tự chọn.

const STOP = new Set(["menu", "menus", "pdf", "jpg", "jpeg", "png", "webp", "the", "and", "final", "new", "copy", "scan", "page", "food", "drinks", "restaurant", "v1", "v2"]);

export function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/, "")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
}

/**
 * Điểm 0–1 = (phần tên quán có trong tên file) × (phần tên file thuộc tên quán).
 * Nhân hai chiều để "sunny-side-pizzeria-austin.pdf" chọn "Sunny Side Pizzeria Austin" hơn "Sunny Side Pizzeria".
 * Chữ dính liền ("casalupita") cũng được tính.
 */
export function matchScore(fileName: string, restaurantName: string): number {
  const f = words(fileName);
  const r = words(restaurantName);
  if (!f.length || !r.length) return 0;
  const joined = f.join("");
  const rHits = r.filter((w) => f.includes(w) || (w.length >= 4 && joined.includes(w))).length;
  const fHits = f.filter((w) => r.includes(w) || r.some((x) => x.length >= 4 && w.includes(x))).length;
  return (rHits / r.length) * (fHits / f.length);
}

/** Quán khớp nhất, nếu đủ chắc (điểm ≥ 0.6 và hơn hẳn quán thứ hai). */
export function bestRestaurant<T extends { name: string }>(fileName: string, restaurants: T[]): T | null {
  let best: T | null = null;
  let top = 0;
  let second = 0;
  for (const r of restaurants) {
    const s = matchScore(fileName, r.name);
    if (s > top) {
      second = top;
      top = s;
      best = r;
    } else if (s > second) second = s;
  }
  return best && top >= 0.6 && top - second >= 0.15 ? best : null;
}
