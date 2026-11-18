// Dữ liệu demo: một quán GIẢ để thử app. Chạy: npx prisma db seed
// Tài khoản demo: demo@example.com (đăng nhập bằng link hiện trên màn hình khi chạy trên máy).
// Chạy lại nhiều lần được: mỗi lần xóa quán demo cũ rồi tạo lại.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type DietaryTag } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_EMAIL = "demo@example.com";
const DEMO_SLUG = "lantern-and-ladle";

type SeedItem = {
  name: string;
  description?: string;
  price: number | null;
  tags?: DietaryTag[];
  allergens?: string[];
  extras?: string[];
  soldOut?: boolean;
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
      { name: "Buttermilk Pancakes", description: "Three fluffy pancakes, maple syrup, whipped butter.", price: 11, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Eggs"], extras: ["Add bacon"] },
      { name: "Avocado Toast", description: "Sourdough, smashed avocado, chili flakes, lemon.", price: 12.5, tags: ["VEGAN"], allergens: ["Gluten"], extras: ["Avocado"] },
      { name: "Farmhouse Omelette", description: "Three eggs, cheddar, peppers, onions, home fries.", price: 13.75, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Eggs", "Dairy"], extras: ["Extra cheese", "Add bacon"] },
    ],
  },
  {
    name: "Starters",
    items: [
      { name: "Crispy Calamari", description: "Lemon aioli, pickled peppers.", price: 14, allergens: ["Shellfish", "Gluten", "Eggs"] },
      { name: "Roasted Tomato Soup", description: "Basil oil, grilled bread.", price: 8.5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"] },
      { name: "Charred Edamame", description: "Sea salt, garlic, chili.", price: 7, tags: ["VEGAN", "GLUTEN_FREE", "SPICY"], allergens: ["Soy"] },
    ],
  },
  {
    name: "Mains",
    items: [
      { name: "Lantern Burger", description: "Two smashed patties, American cheese, house sauce, fries.", price: 17, allergens: ["Gluten", "Dairy", "Eggs"], extras: ["Extra cheese", "Add bacon", "Side salad"] },
      { name: "Grilled Salmon Bowl", description: "Brown rice, cucumber, edamame, miso glaze.", price: 22, tags: ["DAIRY_FREE"], allergens: ["Soy"], extras: ["Avocado"] },
      { name: "Mushroom Risotto", description: "Arborio rice, wild mushrooms, parmesan, thyme.", price: 19.5, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], soldOut: true },
      { name: "Market Fish", description: "Ask your server about today's catch.", price: null, tags: ["GLUTEN_FREE"] },
    ],
  },
  {
    name: "Desserts",
    items: [
      { name: "Warm Apple Crumble", description: "Vanilla ice cream.", price: 9, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Tree nuts"] },
      { name: "Dark Chocolate Mousse", price: 8, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy", "Eggs"] },
    ],
  },
  {
    name: "Drinks",
    items: [
      { name: "Fresh Lemonade", price: 4.5, tags: ["VEGAN"] },
      { name: "Cold Brew", price: 5, tags: ["VEGAN"], extras: ["Oat milk"] },
      { name: "Iced Hibiscus Tea", price: 4, tags: ["VEGAN"] },
    ],
  },
];

const cents = (dollars: number) => Math.round(dollars * 100);

async function main() {
  const user = await db.user.upsert({ where: { email: DEMO_EMAIL }, update: {}, create: { email: DEMO_EMAIL, name: "Demo Owner" } });

  await db.loginToken.deleteMany({ where: { email: DEMO_EMAIL } }); // để đăng nhập demo nhiều lần khi test
  await db.restaurant.deleteMany({ where: { slug: DEMO_SLUG } });
  const restaurant = await db.restaurant.create({
    data: {
      ownerId: user.id,
      slug: DEMO_SLUG,
      name: "Lantern & Ladle",
      tagline: "Neighborhood kitchen, all day",
      description: "A demo restaurant for trying out the app. Not a real place.",
      addressLine: "100 Example Street",
      city: "Springfield",
      region: "IL",
      phone: "+1 555 0100", // số 555-01xx dành cho ví dụ, không phải số thật
      showDirections: true,
      primaryButton: "PHONE",
      secondaryButton: "DIRECTIONS",
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
          priceCents: item.price === null ? null : cents(item.price),
          position: iPos,
          isSoldOut: item.soldOut ?? false,
          dietaryTags: item.tags ?? [],
          allergens: { create: (item.allergens ?? []).map((n) => ({ allergenId: allergenIds.get(n)! })) },
          extras: { create: (item.extras ?? []).map((n) => ({ extraId: extraIds.get(n)! })) },
        },
      });
    }
  }

  const count = await db.menuItem.count({ where: { restaurantId: restaurant.id } });
  console.log(`Seeded demo restaurant "${restaurant.name}" (/@${restaurant.slug}) with ${count} items. Login: ${DEMO_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
