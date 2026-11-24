// Dữ liệu các quán GIẢ để thử app (tên, địa chỉ, số điện thoại đều không có thật; số 555-01xx dành cho ví dụ).
// Mỗi quán có một tài khoản chủ quán riêng vì bản đầu mỗi tài khoản chỉ có một quán.
// Ảnh: prisma/demo-images/<imagesDir>/ (nguồn ghi ở prisma/demo-images/CREDITS.md).

import type { DietaryTag } from "../src/generated/prisma/client";

export type SeedItem = {
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

export type SeedCategory = { name: string; description?: string; days?: number[]; from?: string; until?: string; items: SeedItem[] };

type Hours = { closed: boolean; from: string; until: string };
export type Place = { city: string | null; region: string | null; country: string | null; latitude: number | null; longitude: number | null };
const at = (city: string, region: string, country: string, latitude: number, longitude: number): Place => ({ city, region, country, latitude, longitude });
const UNKNOWN: Place = { city: null, region: null, country: null, latitude: null, longitude: null };

export type DemoRestaurant = {
  email: string;
  slug: string;
  imagesDir: string; // thư mục con trong prisma/demo-images ("" = thư mục gốc)
  logo: string;
  cover: string;
  gallery: string[];
  restaurant: {
    name: string;
    tagline: string;
    description: string;
    addressLine: string;
    city: string;
    region: string;
    postalCode: string;
    addressNote?: string;
    phone: string;
    whatsapp?: string;
    contactEmail?: string;
    customLinkLabel?: string;
    customLinkUrl?: string;
    primaryButton: "PHONE" | "WHATSAPP" | "EMAIL" | "DIRECTIONS" | "CUSTOM_LINK";
    secondaryButton: "PHONE" | "WHATSAPP" | "EMAIL" | "DIRECTIONS" | "CUSTOM_LINK";
    accentColor?: string;
    menuStyle?: "PHOTO" | "CLASSIC" | "BOLD" | "GRID" | "DARK" | "SIMPLE";
    timeZone: string;
    openingHours: Hours[]; // 0 = Chủ nhật … 6 = Thứ bảy
  };
  allergens: string[];
  extras: Array<[string, number]>;
  menu: SeedCategory[];
  // Số liệu thống kê giả 90 ngày
  analytics: {
    seed: number;
    places: Array<[Place, number]>;
    dayBase: number[]; // lượt xem trung bình theo thứ, CN … T7
    hourWeights: Array<[number, number]>; // giờ địa phương của quán
  };
};

const open = (from: string, until: string): Hours => ({ closed: false, from, until });
const closed: Hours = { closed: true, from: "09:00", until: "21:00" };
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

// ── Lantern & Ladle: quán ăn cả ngày (quán demo gốc, các bài test dùng quán này) ──
const lantern: DemoRestaurant = {
  email: "demo@example.com",
  slug: "lantern-and-ladle",
  imagesDir: "",
  logo: "logo.png",
  cover: "cover.jpg",
  gallery: ["gallery-1.jpg", "gallery-2.jpg", "gallery-3.jpg"],
  restaurant: {
    name: "Lantern & Ladle",
    tagline: "Neighborhood kitchen, all day",
    description: "A cozy **all-day kitchen** for the neighborhood.\n\n- Breakfast on weekdays\n- Local, seasonal produce\n\n*This is a demo restaurant, not a real place.*",
    addressLine: "100 Example Street",
    city: "Springfield",
    region: "IL",
    postalCode: "62701",
    addressNote: "Entrance on Example Street. Free street parking after 6 PM.",
    phone: "+1 555 0100",
    primaryButton: "PHONE",
    secondaryButton: "DIRECTIONS",
    timeZone: "America/Chicago",
    // Thứ hai nghỉ, cuối tuần mở muộn hơn
    openingHours: [open("08:00", "15:00"), { closed: true, from: "07:00", until: "21:00" }, open("07:00", "21:00"), open("07:00", "21:00"), open("07:00", "21:00"), open("07:00", "22:00"), open("08:00", "22:00")],
  },
  allergens: ["Gluten", "Dairy", "Eggs", "Tree nuts", "Shellfish", "Soy"],
  extras: [
    ["Extra cheese", 1.5],
    ["Add bacon", 2.5],
    ["Side salad", 4],
    ["Avocado", 2],
    ["Oat milk", 0.75],
  ],
  menu: [
    {
      name: "Breakfast",
      description: "Served weekday mornings.",
      days: WEEKDAYS,
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
  ],
  analytics: {
    seed: 20261119,
    places: [
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
      [UNKNOWN, 3],
    ],
    dayBase: [55, 12, 45, 48, 52, 85, 95], // thứ Hai nghỉ nên ít
    hourWeights: [[7, 4], [8, 7], [9, 6], [10, 4], [11, 8], [12, 12], [13, 8], [14, 3], [15, 2], [16, 3], [17, 7], [18, 11], [19, 10], [20, 6], [21, 2]],
  },
};

// ── Casa Lupita Taqueria: quán taco Mexico ở San Antonio, kiểu menu Bold ──
const taqueria: DemoRestaurant = {
  email: "demo-taqueria@example.com",
  slug: "casa-lupita-taqueria",
  imagesDir: "casa-lupita",
  logo: "logo.png",
  cover: "cover.jpg",
  gallery: [],
  restaurant: {
    name: "Casa Lupita Taqueria",
    tagline: "Street tacos & handmade tortillas",
    description: "Family recipes from **Jalisco**, tortillas pressed by hand every morning.\n\n- Breakfast tacos until 11 AM\n- Salsa bar with 6 house salsas\n\n*This is a demo restaurant, not a real place.*",
    addressLine: "210 Example Avenue",
    city: "San Antonio",
    region: "TX",
    postalCode: "78205",
    addressNote: "Parking lot behind the building. Drive-thru window open until close.",
    phone: "+1 555 0101",
    whatsapp: "+1 555 0101",
    primaryButton: "PHONE",
    secondaryButton: "WHATSAPP",
    accentColor: "#c2410c",
    menuStyle: "BOLD",
    timeZone: "America/Chicago",
    openingHours: [open("08:00", "20:00"), open("07:00", "21:00"), open("07:00", "21:00"), open("07:00", "21:00"), open("07:00", "21:00"), open("07:00", "23:00"), open("07:00", "23:00")],
  },
  allergens: ["Gluten", "Dairy", "Eggs", "Fish", "Tree nuts"],
  extras: [
    ["Guacamole", 2.5],
    ["Extra cheese", 1],
    ["Sour cream", 0.75],
    ["Grilled jalapeños", 1],
    ["Rice & beans", 3.5],
  ],
  menu: [
    {
      name: "Breakfast Tacos",
      description: "On flour tortillas. Served every morning.",
      days: EVERY_DAY,
      from: "07:00",
      until: "11:00",
      items: [
        { name: "Bacon, Egg & Cheese Taco", image: "bacon-egg-taco.jpg", price: 3.5, allergens: ["Gluten", "Eggs", "Dairy"], extras: ["Guacamole"] },
        { name: "Chorizo & Egg Taco", image: "chorizo-egg-taco.jpg", price: 3.75, allergens: ["Gluten", "Eggs"], tags: ["SPICY"] },
        { name: "Potato & Egg Taco", image: "potato-egg-taco.jpg", price: 3.25, tags: ["VEGETARIAN"], allergens: ["Gluten", "Eggs"] },
      ],
    },
    {
      name: "Tacos",
      description: "Corn tortillas, onion, cilantro, lime.",
      items: [
        { name: "Carne Asada Tacos", image: "carne-asada-tacos.jpg", featured: true, description: "Grilled marinated steak, salsa verde.", price: 7.5, sizes: [["2 tacos", 7.5], ["3 tacos", 10.5]], tags: ["GLUTEN_FREE", "DAIRY_FREE"], extras: ["Guacamole", "Grilled jalapeños"] },
        { name: "Al Pastor Tacos", image: "al-pastor-tacos.jpg", description: "Pork marinated in chiles and pineapple, carved from the trompo.", price: 7, sizes: [["2 tacos", 7], ["3 tacos", 9.75]], tags: ["GLUTEN_FREE", "DAIRY_FREE", "SPICY"], extras: ["Guacamole"] },
        { name: "Baja Fish Tacos", image: "fish-tacos.jpg", featured: true, description: "Beer-battered cod, cabbage slaw, chipotle crema.", price: 8.5, sizes: [["2 tacos", 8.5], ["3 tacos", 11.75]], allergens: ["Fish", "Gluten", "Dairy", "Eggs"] },
        { name: "Chicken Tinga Tacos", image: "chicken-tinga-tacos.jpg", description: "Shredded chicken in smoky tomato-chipotle sauce.", price: 6.75, sizes: [["2 tacos", 6.75], ["3 tacos", 9.5]], tags: ["GLUTEN_FREE", "SPICY"], extras: ["Sour cream"] },
        { name: "Veggie Tacos", image: "veggie-tacos.jpg", description: "Roasted peppers, black beans, corn, avocado salsa.", price: 6.5, sizes: [["2 tacos", 6.5], ["3 tacos", 9]], tags: ["VEGAN", "GLUTEN_FREE"] },
        { name: "Barbacoa Tacos", image: "barbacoa-tacos.jpg", description: "Slow-cooked beef cheek. Weekends only.", price: 8, tags: ["GLUTEN_FREE", "DAIRY_FREE"], soldOut: true },
      ],
    },
    {
      name: "Burritos & Plates",
      items: [
        { name: "Carne Asada Burrito", image: "burrito.jpg", featured: true, description: "Steak, rice, beans, pico de gallo, cheese.", price: 12.5, allergens: ["Gluten", "Dairy"], extras: ["Guacamole", "Sour cream", "Grilled jalapeños"] },
        { name: "Bean & Cheese Burrito", image: "bean-cheese-burrito.jpg", price: 8, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"], extras: ["Guacamole", "Sour cream"] },
        { name: "Carne Asada Plate", image: "carne-asada-plate.jpg", description: "Grilled steak, fries, grilled onions, tortillas.", price: 16.5, tags: ["DAIRY_FREE"], extras: ["Rice & beans", "Guacamole"] },
        { name: "Chicken Enchiladas", image: "enchiladas.jpg", description: "Three enchiladas, red sauce, queso fresco, rice and beans.", price: 14, tags: ["GLUTEN_FREE"], allergens: ["Dairy"] },
        { name: "Cheese Quesadilla", image: "quesadilla.jpg", price: 9, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"], extras: ["Guacamole", "Sour cream"] },
      ],
    },
    {
      name: "Sides",
      items: [
        { name: "Chips & Guacamole", image: "chips-guacamole.jpg", price: 6, sizes: [["Small", 6], ["Large", 9.5]], tags: ["VEGAN", "GLUTEN_FREE"] },
        { name: "Elote", image: "elote.jpg", description: "Street corn, mayo, cotija, chili, lime.", price: 5, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy", "Eggs"] },
        { name: "Rice & Beans", image: "rice-beans.jpg", price: 4, tags: ["VEGETARIAN", "GLUTEN_FREE"] },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Horchata", image: "horchata.jpg", description: "Rice, cinnamon, vanilla.", price: 3.5, sizes: [["Medium", 3.5], ["Large", 5]], tags: ["VEGETARIAN"], allergens: ["Dairy", "Tree nuts"] },
        { name: "Agua de Jamaica", image: "jamaica.jpg", description: "Hibiscus flower water.", price: 3.5, sizes: [["Medium", 3.5], ["Large", 5]], tags: ["VEGAN"] },
        { name: "Agua de Tamarindo", image: "tamarindo.jpg", price: 3.5, sizes: [["Medium", 3.5], ["Large", 5]], tags: ["VEGAN"] },
        { name: "Mexican Hot Chocolate", image: "hot-chocolate.jpg", price: 4, tags: ["VEGETARIAN"], allergens: ["Dairy"] },
      ],
    },
  ],
  analytics: {
    seed: 20261120,
    places: [
      [at("San Antonio", "TX", "US", 29.4, -98.5), 60],
      [at("Austin", "TX", "US", 30.3, -97.7), 9],
      [at("New Braunfels", "TX", "US", 29.7, -98.1), 8],
      [at("Houston", "TX", "US", 29.8, -95.4), 4],
      [at("Laredo", "TX", "US", 27.5, -99.5), 3],
      [at("Dallas", "TX", "US", 32.8, -96.8), 2],
      [at("Los Angeles", "CA", "US", 34.1, -118.2), 0.6],
      [at("Monterrey", "NLE", "MX", 25.7, -100.3), 1.5],
      [at("Mexico City", "CMX", "MX", 19.4, -99.1), 0.8],
      [at("Toronto", "ON", "CA", 43.7, -79.4), 0.3],
      [UNKNOWN, 3],
    ],
    dayBase: [80, 55, 50, 52, 60, 92, 105],
    hourWeights: [[7, 7], [8, 9], [9, 6], [10, 4], [11, 9], [12, 13], [13, 9], [14, 4], [15, 3], [16, 3], [17, 7], [18, 11], [19, 10], [20, 7], [21, 4], [22, 2]],
  },
};

// ── Pho Saigon Corner: quán phở Việt ở Little Saigon (California), dùng kiểu menu Classic ──
const pho: DemoRestaurant = {
  email: "demo-pho@example.com",
  slug: "pho-saigon-corner",
  imagesDir: "pho-saigon",
  logo: "logo.png",
  cover: "cover.jpg",
  gallery: ["gallery-1.jpg"],
  restaurant: {
    name: "Pho Saigon Corner",
    tagline: "Phở & Vietnamese comfort food",
    description: "Beef broth simmered for **12 hours** with star anise, cinnamon and charred ginger.\n\n- Lunch specials on weekdays\n- Vegetable broth available for any phở\n\n*This is a demo restaurant, not a real place.*",
    addressLine: "88 Example Boulevard, Suite 4",
    city: "Garden Grove",
    region: "CA",
    postalCode: "92844",
    addressNote: "In the plaza next to the bakery. Plenty of free parking.",
    phone: "+1 555 0102",
    primaryButton: "PHONE",
    secondaryButton: "DIRECTIONS",
    accentColor: "#166534",
    menuStyle: "CLASSIC",
    timeZone: "America/Los_Angeles",
    // Thứ ba nghỉ
    openingHours: [open("08:30", "21:00"), open("09:00", "21:00"), closed, open("09:00", "21:00"), open("09:00", "21:00"), open("09:00", "21:30"), open("08:30", "21:30")],
  },
  allergens: ["Gluten", "Peanuts", "Shellfish", "Fish", "Soy", "Eggs"],
  extras: [
    ["Extra noodles", 2],
    ["Extra meat", 4],
    ["Side of broth", 3],
    ["Fried egg", 1.5],
  ],
  menu: [
    {
      name: "Lunch Specials",
      description: "Weekdays 11 AM – 3 PM.",
      days: WEEKDAYS,
      from: "11:00",
      until: "15:00",
      items: [
        { name: "Phở + Spring Roll Combo", description: "Small phở tái with one spring roll and iced tea.", price: 15, allergens: ["Shellfish", "Peanuts", "Fish"] },
        { name: "Bánh Mì + Soup Combo", description: "Any bánh mì with a cup of phở broth.", price: 12, allergens: ["Gluten", "Eggs"] },
      ],
    },
    {
      name: "Phở",
      description: "Rice noodles in beef broth, with basil, bean sprouts, lime and jalapeño on the side.",
      items: [
        { name: "Phở Tái (Rare Steak)", image: "pho-tai.jpg", featured: true, description: "Thin-sliced rare eye of round.", price: 13.5, sizes: [["Regular", 13.5], ["Large", 15.5]], tags: ["GLUTEN_FREE", "DAIRY_FREE"], allergens: ["Fish"], extras: ["Extra noodles", "Extra meat", "Fried egg"] },
        { name: "Phở Đặc Biệt (House Special)", featured: true, description: "Rare steak, brisket, flank, tendon and meatballs.", price: 14.95, sizes: [["Regular", 14.95], ["Large", 16.95]], tags: ["GLUTEN_FREE", "DAIRY_FREE"], allergens: ["Fish"], extras: ["Extra noodles", "Extra meat"] },
        { name: "Phở Gà (Chicken)", image: "pho-ga.jpg", description: "Poached chicken in a clear ginger chicken broth.", price: 13, sizes: [["Regular", 13], ["Large", 15]], tags: ["GLUTEN_FREE", "DAIRY_FREE"], allergens: ["Fish"], extras: ["Extra noodles", "Extra meat"] },
        { name: "Phở Bò Viên (Meatball)", price: 12.5, sizes: [["Regular", 12.5], ["Large", 14.5]], tags: ["DAIRY_FREE"], allergens: ["Fish", "Soy"] },
        { name: "Phở Chay (Vegetable)", description: "Tofu, mushrooms, bok choy in vegetable broth.", price: 12.5, sizes: [["Regular", 12.5], ["Large", 14.5]], tags: ["VEGAN", "GLUTEN_FREE"], allergens: ["Soy"] },
      ],
    },
    {
      name: "Rice & Vermicelli",
      items: [
        { name: "Bún Thịt Nướng Chả Giò", image: "vermicelli.jpg", featured: true, description: "Vermicelli, grilled lemongrass pork, egg roll, herbs, peanuts, nước chấm.", price: 14, tags: ["DAIRY_FREE"], allergens: ["Peanuts", "Fish", "Gluten"] },
        { name: "Bún Bò Huế", description: "Spicy lemongrass beef noodle soup from Huế.", price: 15, tags: ["SPICY", "DAIRY_FREE"], allergens: ["Fish", "Shellfish"] },
        { name: "Cơm Tấm Sườn", description: "Broken rice, grilled pork chop, pickled vegetables.", price: 14.5, tags: ["DAIRY_FREE", "GLUTEN_FREE"], allergens: ["Fish"], extras: ["Fried egg"] },
        { name: "Garlic Butter Noodles", image: "garlic-noodles.jpg", price: 12, tags: ["VEGETARIAN"], allergens: ["Gluten", "Soy"] },
      ],
    },
    {
      name: "Appetizers",
      items: [
        { name: "Chả Giò (Egg Rolls)", description: "Four crispy pork and shrimp rolls.", price: 7, allergens: ["Shellfish", "Gluten", "Fish"] },
        { name: "Gỏi Cuốn (Spring Rolls)", description: "Two fresh rolls with shrimp, pork, herbs and peanut sauce.", price: 6.5, tags: ["GLUTEN_FREE"], allergens: ["Shellfish", "Peanuts"] },
        { name: "Fish Sauce Chicken Wings", price: 11, tags: ["DAIRY_FREE"], allergens: ["Fish"] },
      ],
    },
    {
      name: "Bánh Mì",
      description: "Toasted baguette, pâté, mayo, pickled carrots, cilantro, jalapeño.",
      items: [
        { name: "Bánh Mì Thịt Nướng", description: "Grilled lemongrass pork.", price: 8, allergens: ["Gluten", "Eggs"] },
        { name: "Bánh Mì Gà", description: "Grilled chicken.", price: 7.5, allergens: ["Gluten", "Eggs"] },
        { name: "Bánh Mì Chay", description: "Lemongrass tofu.", price: 7, tags: ["VEGETARIAN"], allergens: ["Gluten", "Soy", "Eggs"] },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Cà Phê Sữa Đá", description: "Vietnamese iced coffee with condensed milk.", price: 5.5, tags: ["VEGETARIAN"] },
        { name: "Sinh Tố Bơ", description: "Avocado smoothie.", price: 6.5, tags: ["VEGETARIAN"] },
        { name: "Fresh Limeade", price: 4.5, tags: ["VEGAN"] },
        { name: "Jasmine Iced Tea", price: 2, tags: ["VEGAN"] },
      ],
    },
  ],
  analytics: {
    seed: 20261121,
    places: [
      [at("Garden Grove", "CA", "US", 33.8, -117.9), 40],
      [at("Westminster", "CA", "US", 33.8, -118.0), 15],
      [at("Santa Ana", "CA", "US", 33.7, -117.9), 10],
      [at("Anaheim", "CA", "US", 33.8, -117.8), 8],
      [at("Huntington Beach", "CA", "US", 33.7, -118.0), 6],
      [at("Los Angeles", "CA", "US", 34.1, -118.2), 5],
      [at("San Diego", "CA", "US", 32.7, -117.2), 2],
      [at("San Jose", "CA", "US", 37.3, -121.9), 2],
      [at("Houston", "TX", "US", 29.8, -95.4), 1],
      [at("Ho Chi Minh City", "SG", "VN", 10.8, 106.7), 1.2],
      [at("Toronto", "ON", "CA", 43.7, -79.4), 0.4],
      [at("Sydney", "NSW", "AU", -33.9, 151.2), 0.3],
      [UNKNOWN, 3],
    ],
    dayBase: [90, 60, 10, 55, 58, 78, 100], // thứ Ba nghỉ nên ít
    hourWeights: [[9, 5], [10, 7], [11, 12], [12, 14], [13, 10], [14, 5], [15, 3], [16, 3], [17, 7], [18, 10], [19, 9], [20, 5]],
  },
};

// ── Brick Oven Pizza Co.: tiệm pizza ở Brooklyn, kiểu menu Dark ──
const pizza: DemoRestaurant = {
  email: "demo-pizza@example.com",
  slug: "brick-oven-pizza-co",
  imagesDir: "brick-oven",
  logo: "logo.png",
  cover: "cover.jpg",
  gallery: [],
  restaurant: {
    name: "Brick Oven Pizza Co.",
    tagline: "Wood-fired pies since 1998",
    description: "Dough fermented for **48 hours**, baked in a 900°F brick oven.\n\n- Slices all day\n- Gluten-free crust available\n\n*This is a demo restaurant, not a real place.*",
    addressLine: "455 Example Street",
    city: "Brooklyn",
    region: "NY",
    postalCode: "11211",
    phone: "+1 555 0103",
    customLinkLabel: "Order online",
    customLinkUrl: "https://example.com/order",
    primaryButton: "CUSTOM_LINK",
    secondaryButton: "PHONE",
    accentColor: "#b91c1c",
    menuStyle: "DARK",
    timeZone: "America/New_York",
    openingHours: [open("12:00", "21:00"), open("11:00", "22:00"), open("11:00", "22:00"), open("11:00", "22:00"), open("11:00", "22:00"), open("11:00", "23:30"), open("11:00", "23:30")],
  },
  allergens: ["Gluten", "Dairy", "Eggs", "Tree nuts", "Fish"],
  extras: [
    ["Extra cheese", 2],
    ["Pepperoni", 2],
    ["Mushrooms", 1.5],
    ["Vegan cheese", 2.5],
    ["Gluten-free crust", 3],
    ["Ranch dip", 0.75],
  ],
  menu: [
    {
      name: "Lunch Special",
      description: "Weekdays 11 AM – 3 PM.",
      days: WEEKDAYS,
      from: "11:00",
      until: "15:00",
      items: [{ name: "Two Slices + Soda", description: "Any two cheese or pepperoni slices with a fountain soda.", price: 9, allergens: ["Gluten", "Dairy"] }],
    },
    {
      name: "Pizzas",
      description: "12-inch or 16-inch. Gluten-free crust on 12-inch only.",
      items: [
        { name: "Margherita", image: "margherita.jpg", featured: true, description: "San Marzano tomato, fresh mozzarella, basil, olive oil.", price: 14, sizes: [['12"', 14], ['16"', 19]], tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"], extras: ["Extra cheese", "Gluten-free crust"] },
        { name: "Pepperoni", image: "pepperoni.jpg", featured: true, description: "Cup-and-char pepperoni, mozzarella, oregano.", price: 16, sizes: [['12"', 16], ['16"', 21]], allergens: ["Gluten", "Dairy"], extras: ["Extra cheese", "Mushrooms", "Gluten-free crust"] },
        { name: "Meat Lover's", image: "meat-lovers.jpg", description: "Pepperoni, Italian sausage, bacon, ham.", price: 19, sizes: [['12"', 19], ['16"', 25]], allergens: ["Gluten", "Dairy"], extras: ["Extra cheese"] },
        { name: "Garden Veggie", image: "veggie.jpg", description: "Peppers, red onion, mushrooms, olives, cherry tomatoes.", price: 16, sizes: [['12"', 16], ['16"', 21]], tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"], extras: ["Vegan cheese", "Gluten-free crust"] },
        { name: "The Supreme", image: "supreme.jpg", description: "Pepperoni, sausage, peppers, onions, olives.", price: 18, sizes: [['12"', 18], ['16"', 24]], allergens: ["Gluten", "Dairy"] },
        { name: "Spicy Hot Honey", featured: true, description: "Soppressata, mozzarella, chili flakes, hot honey drizzle.", price: 17, sizes: [['12"', 17], ['16"', 22]], tags: ["SPICY"], allergens: ["Gluten", "Dairy"] },
        { name: "White Pie", description: "Ricotta, mozzarella, garlic, no sauce.", price: 16, sizes: [['12"', 16], ['16"', 21]], tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"] },
      ],
    },
    {
      name: "By the Slice",
      items: [
        { name: "Cheese Slice", price: 3.75, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"] },
        { name: "Pepperoni Slice", price: 4.5, allergens: ["Gluten", "Dairy"] },
        { name: "Slice of the Day", description: "Ask at the counter.", price: null, allergens: ["Gluten", "Dairy"] },
      ],
    },
    {
      name: "Starters & Salads",
      items: [
        { name: "Garlic Knots", description: "Six knots, garlic butter, parmesan, marinara.", price: 6, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"] },
        { name: "Garlic Parmesan Fries", image: "fries.jpg", price: 7, tags: ["VEGETARIAN"], allergens: ["Dairy"], extras: ["Ranch dip"] },
        { name: "Greek Salad", image: "greek-salad.jpg", description: "Tomato, cucumber, olives, feta, red onion.", price: 11, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"] },
        { name: "Caesar Salad", price: 10, allergens: ["Gluten", "Dairy", "Eggs", "Fish"] },
      ],
    },
    {
      name: "Pasta",
      items: [
        { name: "Baked Lasagna", image: "lasagna.jpg", featured: true, description: "Beef ragù, ricotta, mozzarella, baked to order.", price: 17, allergens: ["Gluten", "Dairy", "Eggs"] },
        { name: "Penne alla Vodka", price: 16, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"], soldOut: true },
      ],
    },
    {
      name: "Desserts",
      items: [
        { name: "Cannoli", price: 5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Tree nuts"] },
        { name: "Tiramisu", price: 7.5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Eggs"] },
      ],
    },
    {
      name: "Drinks",
      items: [
        { name: "Fountain Soda", price: 2.75, sizes: [["Regular", 2.75], ["Large", 3.5]], tags: ["VEGAN"] },
        { name: "Italian Soda", price: 4, tags: ["VEGAN"] },
        { name: "Local Draft Beer", description: "Ask about today's taps. 21+ with ID.", price: 7 },
      ],
    },
  ],
  analytics: {
    seed: 20261122,
    places: [
      [at("Brooklyn", "NY", "US", 40.7, -73.9), 50],
      [at("New York", "NY", "US", 40.8, -74.0), 18],
      [at("Queens", "NY", "US", 40.7, -73.8), 7],
      [at("Jersey City", "NJ", "US", 40.7, -74.1), 6],
      [at("Newark", "NJ", "US", 40.7, -74.2), 2],
      [at("Philadelphia", "PA", "US", 40.0, -75.2), 1.5],
      [at("Boston", "MA", "US", 42.4, -71.1), 1.5],
      [at("Toronto", "ON", "CA", 43.7, -79.4), 0.5],
      [at("London", "ENG", "GB", 51.5, -0.1), 0.8],
      [at("Paris", "IDF", "FR", 48.9, 2.4), 0.6],
      [at("Rome", "62", "IT", 41.9, 12.5), 0.5],
      [at("Tokyo", "13", "JP", 35.7, 139.7), 0.3],
      [UNKNOWN, 3],
    ],
    dayBase: [75, 45, 48, 50, 60, 110, 120],
    hourWeights: [[11, 4], [12, 10], [13, 8], [14, 4], [15, 3], [16, 4], [17, 8], [18, 12], [19, 13], [20, 10], [21, 7], [22, 4], [23, 2]],
  },
};

// ── Morning Grind Café: quán cà phê ở Denver, kiểu menu Grid ──
const cafe: DemoRestaurant = {
  email: "demo-cafe@example.com",
  slug: "morning-grind-cafe",
  imagesDir: "morning-grind",
  logo: "logo.png",
  cover: "cover.jpg",
  gallery: ["gallery-1.jpg", "gallery-2.jpg", "gallery-3.jpg"],
  restaurant: {
    name: "Morning Grind Café",
    tagline: "Small-batch coffee & fresh pastries",
    description: "Beans roasted **every Monday** a few blocks away. Pastries baked in-house each morning.\n\n- Free Wi‑Fi\n- Oat and almond milk at no extra charge on weekdays before 8 AM\n\n*This is a demo café, not a real place.*",
    addressLine: "1200 Example Street",
    city: "Denver",
    region: "CO",
    postalCode: "80202",
    addressNote: "Bike racks out front. Street parking is free on Sundays.",
    phone: "+1 555 0104",
    contactEmail: "hello@example.com",
    primaryButton: "DIRECTIONS",
    secondaryButton: "EMAIL",
    accentColor: "#6b3f23",
    menuStyle: "GRID",
    timeZone: "America/Denver",
    openingHours: [open("07:30", "16:00"), open("06:30", "17:00"), open("06:30", "17:00"), open("06:30", "17:00"), open("06:30", "17:00"), open("06:30", "17:00"), open("07:30", "16:00")],
  },
  allergens: ["Gluten", "Dairy", "Eggs", "Tree nuts", "Soy"],
  extras: [
    ["Oat milk", 0.75],
    ["Almond milk", 0.75],
    ["Extra shot", 1],
    ["Vanilla syrup", 0.75],
    ["Add egg", 2],
  ],
  menu: [
    {
      name: "Espresso Bar",
      items: [
        { name: "Latte", image: "latte.jpg", featured: true, price: 4.75, sizes: [["12 oz", 4.75], ["16 oz", 5.5]], tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], extras: ["Oat milk", "Almond milk", "Extra shot", "Vanilla syrup"] },
        { name: "Cappuccino", image: "cappuccino.jpg", price: 4.25, sizes: [["8 oz", 4.25], ["12 oz", 4.75]], tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], extras: ["Oat milk", "Almond milk", "Extra shot"] },
        { name: "Iced Latte", image: "iced-latte.jpg", featured: true, price: 5.25, sizes: [["16 oz", 5.25], ["20 oz", 6]], tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], extras: ["Oat milk", "Almond milk", "Extra shot", "Vanilla syrup"] },
        { name: "Americano", price: 3.75, sizes: [["12 oz", 3.75], ["16 oz", 4.25]], tags: ["VEGAN", "GLUTEN_FREE"], extras: ["Extra shot"] },
        { name: "Mocha", description: "Espresso, dark chocolate, steamed milk.", price: 5.25, sizes: [["12 oz", 5.25], ["16 oz", 6]], tags: ["VEGETARIAN"], allergens: ["Dairy"], extras: ["Oat milk", "Extra shot"] },
        { name: "Flat White", price: 4.75, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], extras: ["Oat milk"] },
      ],
    },
    {
      name: "Brewed Coffee",
      items: [
        { name: "Pour Over", image: "pour-over.jpg", description: "Single origin, brewed to order. Ask about today's beans.", price: 5.5, tags: ["VEGAN", "GLUTEN_FREE"] },
        { name: "Drip Coffee", price: 2.75, sizes: [["12 oz", 2.75], ["16 oz", 3.25]], tags: ["VEGAN", "GLUTEN_FREE"] },
        { name: "Cold Brew", description: "Steeped 18 hours.", price: 4.5, sizes: [["16 oz", 4.5], ["20 oz", 5.25]], tags: ["VEGAN", "GLUTEN_FREE"], extras: ["Oat milk", "Vanilla syrup"] },
      ],
    },
    {
      name: "Breakfast",
      description: "Served until 11 AM.",
      days: EVERY_DAY,
      from: "06:30",
      until: "11:00",
      items: [
        { name: "Breakfast Burrito", description: "Scrambled eggs, potatoes, cheddar, green chile.", price: 9.5, tags: ["VEGETARIAN", "SPICY"], allergens: ["Gluten", "Eggs", "Dairy"] },
        { name: "Avocado Toast", description: "Sourdough, avocado, radish, everything seasoning.", price: 10, tags: ["VEGAN"], allergens: ["Gluten"], extras: ["Add egg"] },
        { name: "Grain Bowl", image: "grain-bowl.jpg", description: "Quinoa, roasted chickpeas, greens, avocado, tahini.", price: 12, tags: ["VEGAN", "GLUTEN_FREE"], extras: ["Add egg"] },
        { name: "Yogurt Parfait", description: "Greek yogurt, granola, berries, honey.", price: 7, tags: ["VEGETARIAN"], allergens: ["Dairy", "Tree nuts", "Gluten"] },
      ],
    },
    {
      name: "Pastries",
      items: [
        { name: "Fruit Tart", image: "fruit-tarts.jpg", featured: true, description: "Vanilla custard, seasonal fruit.", price: 5.5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Eggs"] },
        { name: "Butter Croissant", price: 3.75, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy"] },
        { name: "Almond Croissant", price: 4.5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Tree nuts", "Eggs"] },
        { name: "Blueberry Muffin", price: 3.5, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Eggs"] },
        { name: "Chocolate Chip Cookie", price: 3, tags: ["VEGETARIAN"], allergens: ["Gluten", "Dairy", "Eggs"], soldOut: true },
      ],
    },
    {
      name: "Tea & More",
      items: [
        { name: "Matcha Latte", price: 5.5, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], extras: ["Oat milk", "Almond milk", "Vanilla syrup"] },
        { name: "Chai Latte", price: 5, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"], extras: ["Oat milk", "Almond milk"] },
        { name: "Hot Chocolate", price: 4, tags: ["VEGETARIAN", "GLUTEN_FREE"], allergens: ["Dairy"] },
        { name: "Fresh Orange Juice", price: 5, tags: ["VEGAN", "GLUTEN_FREE"] },
      ],
    },
  ],
  analytics: {
    seed: 20261123,
    places: [
      [at("Denver", "CO", "US", 39.7, -105.0), 55],
      [at("Aurora", "CO", "US", 39.7, -104.8), 9],
      [at("Lakewood", "CO", "US", 39.7, -105.1), 6],
      [at("Boulder", "CO", "US", 40.0, -105.3), 6],
      [at("Colorado Springs", "CO", "US", 38.8, -104.8), 3],
      [at("Fort Collins", "CO", "US", 40.6, -105.1), 2],
      [at("Salt Lake City", "UT", "US", 40.8, -111.9), 1],
      [at("Chicago", "IL", "US", 41.9, -87.6), 1],
      [at("Los Angeles", "CA", "US", 34.1, -118.2), 0.8],
      [at("Calgary", "AB", "CA", 51.0, -114.1), 0.4],
      [at("London", "ENG", "GB", 51.5, -0.1), 0.3],
      [UNKNOWN, 3],
    ],
    dayBase: [65, 75, 72, 74, 76, 80, 90],
    hourWeights: [[6, 6], [7, 12], [8, 13], [9, 10], [10, 8], [11, 6], [12, 7], [13, 5], [14, 4], [15, 3], [16, 1]],
  },
};

export const DEMO_RESTAURANTS: DemoRestaurant[] = [lantern, taqueria, pho, pizza, cafe];
