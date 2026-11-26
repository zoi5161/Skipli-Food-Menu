import { describe, expect, it } from "vitest";
import { bestRestaurant, matchScore, words } from "@/lib/studio/match";

const LIST = [
  { id: "1", name: "Casa Lupita Taqueria" },
  { id: "2", name: "Pho Saigon Corner" },
  { id: "3", name: "Pho Little Saigon" },
  { id: "4", name: "Brick Oven Pizza Co." },
  { id: "5", name: "Morning Grind Café" },
  { id: "6", name: "Lantern & Ladle" },
];

describe("gợi ý quán theo tên file", () => {
  it("tách chữ, bỏ đuôi file, chữ chung chung và số", () => {
    expect(words("Casa-Lupita_MENU 2026.pdf")).toEqual(["casa", "lupita"]);
    expect(words("Morning Grind Café.PDF")).toEqual(["morning", "grind", "cafe"]);
  });

  it("khớp tên file thường gặp", () => {
    expect(bestRestaurant("casa-lupita-menu.pdf", LIST)?.id).toBe("1");
    expect(bestRestaurant("CasaLupitaTaqueria.pdf", LIST)?.id).toBe("1");
    expect(bestRestaurant("morning_grind_cafe_2026.pdf", LIST)?.id).toBe("5");
    expect(bestRestaurant("Brick Oven Pizza menu.jpg", LIST)?.id).toBe("4");
    expect(bestRestaurant("lantern-and-ladle.pdf", LIST)?.id).toBe("6");
    expect(bestRestaurant("pho saigon corner.pdf", LIST)?.id).toBe("2");
  });

  it("hai quán gần tên: chọn quán khớp đủ", () => {
    const list = [...LIST, { id: "7", name: "Brick Oven Pizza Co. Austin" }];
    expect(bestRestaurant("brick-oven-pizza-austin.pdf", list)?.id).toBe("7");
    expect(bestRestaurant("brick oven pizza co.pdf", list)?.id).toBe("4");
  });

  it("không chắc thì không gợi ý", () => {
    expect(bestRestaurant("pho.pdf", LIST)).toBeNull(); // hai quán phở
    expect(bestRestaurant("scan0001.pdf", LIST)).toBeNull();
    expect(bestRestaurant("menu.pdf", LIST)).toBeNull();
  });

  it("điểm cao hơn khi khớp nhiều chữ", () => {
    expect(matchScore("pho saigon corner", "Pho Saigon Corner")).toBeGreaterThan(matchScore("pho saigon", "Pho Saigon Corner"));
  });
});
