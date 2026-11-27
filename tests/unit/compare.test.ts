import { describe, expect, it } from "vitest";
import { compareDish, currentIndex, dishKey, priceLabel, priceWarning, removedDishes } from "@/lib/menu/compare";

const current = currentIndex([
  { name: "Phở Tái", priceCents: 1350, variants: [{ name: "Regular", priceCents: 1350 }, { name: "Large", priceCents: 1550 }] },
  { name: "Latte", priceCents: 450, variants: [] },
  { name: "Seasonal Soup", priceCents: null, variants: [] },
]);

describe("so sánh với menu đang có", () => {
  it("so tên bỏ dấu, hoa thường, dấu cách", () => {
    expect(dishKey("  PHO   tái ")).toBe(dishKey("Phở Tái"));
  });

  it("món mới, giữ nguyên, đổi giá", () => {
    expect(compareDish({ name: "Cold Brew", priceCents: 525, variants: [] }, current)).toEqual({ kind: "new" });
    expect(compareDish({ name: "latte", priceCents: 450, variants: [] }, current)).toEqual({ kind: "same" });
    expect(compareDish({ name: "Latte", priceCents: 475, variants: [] }, current)).toEqual({ kind: "price", from: "$4.50", to: "$4.75" });
    expect(compareDish({ name: "Pho Tai", priceCents: null, variants: [{ name: "Regular", priceCents: 1350 }, { name: "Large", priceCents: 1600 }] }, current)).toEqual({
      kind: "price",
      from: "Regular $13.50 / Large $15.50",
      to: "Regular $13.50 / Large $16.00",
    });
    expect(compareDish({ name: "Seasonal Soup", priceCents: 800, variants: [] }, current)).toEqual({ kind: "price", from: "no price", to: "$8.00" });
  });

  it("một cỡ duy nhất coi như một giá", () => {
    expect(priceLabel({ priceCents: null, variants: [{ name: "One", priceCents: 450 }] })).toBe("$4.50");
    expect(compareDish({ name: "Latte", priceCents: null, variants: [{ name: "Cup", priceCents: 450 }] }, current)).toEqual({ kind: "same" });
  });

  it("món sẽ bị xóa khi thay cả menu", () => {
    const now = [{ name: "Latte" }, { name: "Mocha" }, { name: "Phở Tái" }];
    expect(removedDishes(now, [{ name: "latte" }, { name: "Pho Tai" }]).map((d) => d.name)).toEqual(["Mocha"]);
  });
});

describe("nhắc kiểm tra giá", () => {
  it("thiếu giá hoặc giá $0", () => {
    expect(priceWarning({ priceCents: null, variants: [] })).toBe("No price");
    expect(priceWarning({ priceCents: 0, variants: [] })).toBe("Price is $0");
    expect(priceWarning({ priceCents: null, variants: [{ name: "S", priceCents: 0 }, { name: "L", priceCents: 500 }] })).toBe("A size costs $0");
    expect(priceWarning({ priceCents: null, variants: [{ name: "Cup", priceCents: 0 }] })).toBe("Price is $0");
  });
  it("giá bình thường thì không nhắc (kể cả giá rất cao)", () => {
    expect(priceWarning({ priceCents: 1250, variants: [] })).toBeNull();
    expect(priceWarning({ priceCents: 999_00, variants: [] })).toBeNull();
    expect(priceWarning({ priceCents: null, variants: [{ name: "S", priceCents: 400 }, { name: "L", priceCents: 500 }] })).toBeNull();
  });
});
