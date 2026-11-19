// Dữ liệu demo: một quán GIẢ để thử app. Chạy: npx prisma db seed
// Tài khoản demo: demo@example.com (đăng nhập bằng link hiện trên màn hình khi chạy trên máy).
// Chạy lại nhiều lần được: mỗi lần xóa quán demo cũ rồi tạo lại.

import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type DietaryTag } from "../src/generated/prisma/client";
import { removeStoredImage, storageMode, storeImage } from "../src/lib/storage";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_EMAIL = "demo@example.com";
const DEMO_SLUG = "lantern-and-ladle";

// Ảnh demo (Unsplash, xem prisma/demo-images/CREDITS.md) được đưa vào kho ảnh giống như chủ quán tự tải lên:
// kho S3 nếu .env có cấu hình S3_*, nếu không thì thư mục storage/media trên máy.
const IMAGES_DIR = path.join(process.cwd(), "prisma", "demo-images");
async function demoImage(restaurantId: string, file: string): Promise<string> {
  const bytes = new Uint8Array(await readFile(path.join(IMAGES_DIR, file)));
  return storeImage(restaurantId, bytes, file.endsWith(".png") ? "png" : "jpg");
}

// Giờ mở cửa (0 = Chủ nhật): Thứ hai nghỉ, cuối tuần mở muộn hơn.
const HOURS = [
  { closed: false, from: "08:00", until: "15:00" },
  { closed: true, from: "07:00", until: "21:00" },
  { closed: false, from: "07:00", until: "21:00" },
  { closed: false, from: "07:00", until: "21:00" },
  { closed: false, from: "07:00", until: "21:00" },
  { closed: false, from: "07:00", until: "22:00" },
  { closed: false, from: "08:00", until: "22:00" },
];

type SeedItem = {
  name: string;
  description?: string;
  price: number | null;
  tags?: DietaryTag[];
  allergens?: string[];
  extras?: string[];
  soldOut?: boolean;
  image?: string;
  featured?: boolean;
  sizes?: Array<[string, number]>;
};

const ALLERGENS = ["Gluten", "Dairy", "Eggs", "Tree nuts", "Shellfish", "Soy"];
const EXTRAS: Array<[string, number]> = [
  ["Extra cheese", 1.5],
  ["Add bacon", 2.5],
  ["Side salad", 4],
  ["Avocado", 2],
  ["Oat milk", 0.75],
];

const MENU: Array<{ name: string; description?: string; days?: number[]; from?: string; until?: string; items: SeedItem[] }> = [
  {
    name: "Breakfast",
    description: "Served weekday mornings.",
    days: [1, 2, 3, 4, 5],
    from: "07:00",
    until: "11:00",
    items: [
      { name: "Buttermilk Pancakes", image: "pancakes.jpg", featured: true, description: "Fluffy pancakes, maple syrup, whipped butter.", price: 11, sizes: [["Short stack (2)", 8], ["Full stack (3)", 11]], tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Eggs"], extras: ["Add bacon"] },
      { name: "Avocado Toast", image: "avocado-toast.jpg", description: "Sourdough, smashed avocado, chili flakes, lemon.", price: 12.5, tags: ["VEGAN"], allergens: ["Gluten"], extras: ["Avocado"] },
      { name: "Farmhouse Omelette", image: "omelette.jpg", description: "Three eggs, cheddar, peppers, onions, home fries.", price: 13.75, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Eggs", "Dairy"], extras: ["Extra cheese", "Add bacon"] },
    ],
  },
  {
    name: "Starters",
    items: [
      { name: "Crispy Calamari", description: "Lemon aioli, pickled peppers.", price: 14, allergens: ["Shellfish", "Gluten", "Eggs"] },
      { name: "Roasted Tomato Soup", image: "tomato-soup.jpg", description: "Basil oil, grilled bread.", price: 8.5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"] },
      { name: "Charred Edamame", description: "Sea salt, garlic, chili.", price: 7, tags: ["VEGAN", "GLUTEN_FREE", "SPICY"], allergens: ["Soy"] },
    ],
  },
  {
    name: "Mains",
    items: [
      { name: "Lantern Burger", image: "burger.jpg", featured: true, description: "Two smashed patties, American cheese, house sauce, fries.", price: 17, allergens: ["Gluten", "Dairy", "Eggs"], extras: ["Extra cheese", "Add bacon", "Side salad"] },
      { name: "Grilled Salmon Bowl", image: "salmon.jpg", featured: true, description: "Brown rice, cucumber, edamame, miso glaze.", price: 22, tags: ["DAIRY_FREE"], allergens: ["Soy"], extras: ["Avocado"] },
      { name: "Mushroom Risotto", image: "risotto.jpg", description: "Arborio rice, wild mushrooms, parmesan, thyme.", price: 19.5, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], soldOut: true },
      { name: "Market Fish", image: "market-fish.jpg", description: "Ask your server about today's catch.", price: null, tags: ["GLUTEN_FREE"] },
    ],
  },
  {
    name: "Desserts",
    items: [
      { name: "Warm Apple Crumble", image: "apple-crumble.jpg", featured: true, description: "Vanilla ice cream.", price: 9, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Tree nuts"] },
      { name: "Dark Chocolate Mousse", image: "chocolate-mousse.jpg", price: 8, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy", "Eggs"] },
    ],
  },
  {
    name: "Drinks",
    items: [
      { name: "Fresh Lemonade", image: "lemonade.jpg", price: 4.5, sizes: [["Glass", 4.5], ["Pitcher", 14]], tags: ["VEGAN"] },
      { name: "Cold Brew", image: "cold-brew.jpg", price: 5, sizes: [["Small", 4.5], ["Large", 5.5]], tags: ["VEGAN"], extras: ["Oat milk"] },
      { name: "Iced Hibiscus Tea", image: "hibiscus-tea.jpg", price: 4, sizes: [["Small", 3.5], ["Medium", 4], ["Large", 4.75]], tags: ["VEGAN"] },
    ],
  },
];

const cents = (dollars: number) => Math.round(dollars * 100);

async function main() {
  const user = await db.user.upsert({ where: { email: DEMO_EMAIL }, update: {}, create: { email: DEMO_EMAIL, name: "Demo Owner" } });

  await db.loginToken.deleteMany({ where: { email: DEMO_EMAIL } }); // để đăng nhập demo nhiều lần khi test
  // Xóa ảnh của bản demo cũ (trên máy hoặc trên kho S3)
  const old = await db.restaurant.findUnique({ where: { slug: DEMO_SLUG }, select: { id: true, logoUrl: true, coverUrl: true, galleryUrls: true, items: { select: { imageUrl: true } } } });
  if (old) {
    for (const url of [old.logoUrl, old.coverUrl, ...old.galleryUrls, ...old.items.map((i) => i.imageUrl)]) await removeStoredImage(old.id, url);
  }
  await db.restaurant.deleteMany({ where: { slug: DEMO_SLUG } });
  const restaurant = await db.restaurant.create({
    data: {
      ownerId: user.id,
      slug: DEMO_SLUG,
      name: "Lantern & Ladle",
      tagline: "Neighborhood kitchen, all day",
      addressLine: "100 Example Street",
      city: "Springfield",
      region: "IL",
      phone: "+1 555 0100", // số 555-01xx dành cho ví dụ, không phải số thật
      showDirections: true,
      primaryButton: "PHONE",
      secondaryButton: "DIRECTIONS",
      isPublished: true,
      description: "A cozy **all-day kitchen** for the neighborhood.\n\n- Breakfast on weekdays\n- Local, seasonal produce\n\n*This is a demo restaurant, not a real place.*",
      postalCode: "62701",
      addressNote: "Entrance on Example Street. Free street parking after 6 PM.",
      openingHours: HOURS,
      timeZone: "America/Chicago",
    },
  });
  await db.restaurant.update({
    where: { id: restaurant.id },
    data: {
      logoUrl: await demoImage(restaurant.id, "logo.png"),
      coverUrl: await demoImage(restaurant.id, "cover.jpg"),
      galleryUrls: [await demoImage(restaurant.id, "gallery-1.jpg"), await demoImage(restaurant.id, "gallery-2.jpg"), await demoImage(restaurant.id, "gallery-3.jpg")],
    },
  });

  const allergenIds = new Map<string, string>();
  for (const [position, name] of ALLERGENS.entries()) {
    const a = await db.allergen.create({ data: { restaurantId: restaurant.id, name, position } });
    allergenIds.set(name, a.id);
  }

  const extraIds = new Map<string, string>();
  for (const [position, [name, price]] of EXTRAS.entries()) {
    const x = await db.extra.create({ data: { restaurantId: restaurant.id, name, priceCents: cents(price), position } });
    extraIds.set(name, x.id);
  }

  for (const [cPos, cat] of MENU.entries()) {
    const category = await db.category.create({
      data: {
        restaurantId: restaurant.id,
        name: cat.name,
        description: cat.description,
        position: cPos,
        servingDays: cat.days ?? [],
        servingFrom: cat.from ?? null,
        servingUntil: cat.until ?? null,
      },
    });
    for (const [iPos, item] of cat.items.entries()) {
      await db.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          priceCents: item.sizes ? Math.min(...item.sizes.map(([, p]) => cents(p))) : item.price === null ? null : cents(item.price),
          position: iPos,
          isSoldOut: item.soldOut ?? false,
          isFeatured: item.featured ?? false,
          imageUrl: item.image ? await demoImage(restaurant.id, item.image) : null,
          dietaryTags: item.tags ?? [],
          allergens: { create: (item.allergens ?? []).map((n) => ({ allergenId: allergenIds.get(n)! })) },
          extras: { create: (item.extras ?? []).map((n) => ({ extraId: extraIds.get(n)! })) },
          variants: { create: (item.sizes ?? []).map(([name, price], position) => ({ name, priceCents: cents(price), position })) },
        },
      });
    }
  }

  await seedAnalytics(restaurant.id);

  console.log(`Demo photos stored in: ${storageMode() === "s3" ? "S3 bucket" : "storage/media on this computer"}`);
  const count = await db.menuItem.count({ where: { restaurantId: restaurant.id } });
  console.log(`Seeded demo restaurant "${restaurant.name}" (/@${restaurant.slug}) with ${count} items. Login: ${DEMO_EMAIL}`);
}

// ── Số liệu thống kê GIẢ cho quán demo (90 ngày), để trang Stats có dữ liệu khi xem thử ──
// Quy luật giống quán thật: cuối tuần đông hơn, thứ Hai nghỉ, đông vào giờ ăn; phần lớn khách
// quét QR; khách ở quanh Springfield. Dùng bộ sinh số ngẫu nhiên cố định nên mỗi lần seed ra như nhau.
async function seedAnalytics(restaurantId: string) {
  let seed = 20261119;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(choices: Array<[T, number]>): T => {
    let r = rand() * choices.reduce((s, [, w]) => s + w, 0);
    for (const [v, w] of choices) if ((r -= w) < 0) return v;
    return choices[0][0];
  };
  const hex = () => Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");

  const items = await db.menuItem.findMany({ where: { restaurantId }, select: { id: true, isFeatured: true, imageUrl: true } });
  const itemWeights: Array<[string, number]> = items.map((i) => [i.id, (i.isFeatured ? 4 : 1) * (i.imageUrl ? 2 : 1)]);
  const sources: Array<[{ source: "QR" | "DIRECT" | "GOOGLE" | "INSTAGRAM" | "FACEBOOK" | "OTHER"; referrerHost: string | null }, number]> = [
    [{ source: "QR", referrerHost: null }, 45],
    [{ source: "DIRECT", referrerHost: null }, 20],
    [{ source: "GOOGLE", referrerHost: "google.com" }, 15],
    [{ source: "INSTAGRAM", referrerHost: "l.instagram.com" }, 11],
    [{ source: "FACEBOOK", referrerHost: "m.facebook.com" }, 4],
    [{ source: "OTHER", referrerHost: "yelp.com" }, 3],
    [{ source: "OTHER", referrerHost: "tripadvisor.com" }, 2],
  ];
  type Place = { city: string | null; region: string | null; country: string | null; latitude: number | null; longitude: number | null };
  const at = (city: string, region: string, country: string, latitude: number, longitude: number): Place => ({ city, region, country, latitude, longitude });
  const places: Array<[Place, number]> = [
    [at("Springfield", "IL", "US", 39.8, -89.6), 55],
    [at("Chicago", "IL", "US", 41.9, -87.6), 11],
    [at("St. Louis", "MO", "US", 38.6, -90.2), 8],
    [at("Champaign", "IL", "US", 40.1, -88.2), 7],
    [at("Peoria", "IL", "US", 40.7, -89.6), 6],
    [at("Decatur", "IL", "US", 39.8, -89.0), 5],
    [at("Indianapolis", "IN", "US", 39.8, -86.2), 3],
    [at("Nashville", "TN", "US", 36.2, -86.8), 1.2],
    [at("Dallas", "TX", "US", 32.8, -96.8), 1],
    [at("New York", "NY", "US", 40.7, -74.0), 1],
    [at("Los Angeles", "CA", "US", 34.1, -118.2), 0.8],
    // Khách du lịch nước ngoài
    [at("Toronto", "ON", "CA", 43.7, -79.4), 0.8],
    [at("Mexico City", "CMX", "MX", 19.4, -99.1), 0.5],
    [at("London", "ENG", "GB", 51.5, -0.1), 0.5],
    [at("Berlin", "BE", "DE", 52.5, 13.4), 0.3],
    [at("Tokyo", "13", "JP", 35.7, 139.7), 0.3],
    [at("Ho Chi Minh City", "SG", "VN", 10.8, 106.7), 0.2],
    [{ city: null, region: null, country: null, latitude: null, longitude: null }, 3],
  ];
  // Giờ trong ngày (giờ quán): đông lúc ăn sáng, trưa, tối
  const hourWeights: Array<[number, number]> = [[7, 4], [8, 7], [9, 6], [10, 4], [11, 8], [12, 12], [13, 8], [14, 3], [15, 2], [16, 3], [17, 7], [18, 11], [19, 10], [20, 6], [21, 2]];
  const dayBase = [55, 12, 45, 48, 52, 85, 95]; // CN … T7 (thứ Hai nghỉ nên ít)

  const now = Date.now();
  const views: object[] = [];
  const clicks: object[] = [];
  for (let back = 89; back >= 0; back--) {
    const date = new Date(now - back * 86_400_000);
    // Giờ Chicago: UTC-5 trước 1/11/2026 (giờ mùa hè), UTC-6 sau đó
    const offset = date < new Date("2026-11-01T07:00:00Z") ? 5 : 6;
    const local = new Date(date.getTime() - offset * 3_600_000);
    const growth = 0.75 + 0.35 * ((89 - back) / 89); // quán đang đông dần
    const n = Math.round(dayBase[local.getUTCDay()] * growth * (0.85 + rand() * 0.3));
    const dayVisitors: string[] = [];
    for (let k = 0; k < n; k++) {
      const hour = pick(hourWeights);
      const at = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour + offset, Math.floor(rand() * 60), Math.floor(rand() * 60));
      if (at > now) continue;
      const visitorHash = dayVisitors.length > 3 && rand() < 0.12 ? dayVisitors[Math.floor(rand() * dayVisitors.length)] : hex();
      dayVisitors.push(visitorHash);
      const src = pick(sources);
      views.push({
        restaurantId,
        visitorHash,
        source: src.source,
        referrerHost: src.referrerHost,
        device: pick<"MOBILE" | "DESKTOP" | "TABLET">([["MOBILE", 82], ["DESKTOP", 12], ["TABLET", 6]]),
        ...pick(places),
        createdAt: new Date(at),
      });
      const taps = pick([[0, 30], [1, 35], [2, 22], [3, 13]]);
      for (let t = 0; t < taps; t++) {
        const tapAt = at + (t + 1) * (20 + Math.floor(rand() * 90)) * 1000;
        if (tapAt <= now) clicks.push({ restaurantId, visitorHash, itemId: pick(itemWeights), createdAt: new Date(tapAt) });
      }
    }
  }
  for (let i = 0; i < views.length; i += 2000) await db.pageView.createMany({ data: views.slice(i, i + 2000) as never });
  for (let i = 0; i < clicks.length; i += 2000) await db.itemClick.createMany({ data: clicks.slice(i, i + 2000) as never });
  console.log(`Seeded ${views.length} demo views and ${clicks.length} dish taps (90 days, fake).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
