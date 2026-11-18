import { describe, expect, it } from "vitest";
import {
  allergenCode,
  centsToInput,
  formatClock,
  formatDays,
  formatPrice,
  formatServingTimes,
  parsePriceInput,
  slugify,
} from "@/lib/menu/format";

describe("price", () => {
  it("formats cents as USD", () => {
    expect(formatPrice(1250)).toBe("$12.50");
    expect(formatPrice(0)).toBe("$0.00");
    expect(formatPrice(null)).toBe("");
  });

  it("parses what owners type", () => {
    expect(parsePriceInput("12")).toEqual({ ok: true, cents: 1200 });
    expect(parsePriceInput("12.5")).toEqual({ ok: true, cents: 1250 });
    expect(parsePriceInput("$12.50")).toEqual({ ok: true, cents: 1250 });
    expect(parsePriceInput("12,50")).toEqual({ ok: true, cents: 1250 });
    expect(parsePriceInput("1,250")).toEqual({ ok: true, cents: 125000 });
    expect(parsePriceInput("0.1")).toEqual({ ok: true, cents: 10 });
    expect(parsePriceInput("  ")).toEqual({ ok: true, cents: null });
  });

  it("rejects bad prices", () => {
    expect(parsePriceInput("abc").ok).toBe(false);
    expect(parsePriceInput("12.505").ok).toBe(false);
    expect(parsePriceInput("-3").ok).toBe(false);
    expect(parsePriceInput("9999999").ok).toBe(false);
  });

  it("round-trips through the input field", () => {
    expect(centsToInput(1250)).toBe("12.50");
    expect(centsToInput(null)).toBe("");
  });
});

describe("slugify", () => {
  it("makes clean links", () => {
    expect(slugify("Lantern & Ladle Café")).toBe("lantern-and-ladle-cafe");
    expect(slugify("  Phở Đà Nẵng!! ")).toBe("pho-da-nang");
    expect(slugify("!!!")).toBe("menu");
  });
});

describe("allergen codes", () => {
  it("counts like spreadsheet columns", () => {
    expect(allergenCode(0)).toBe("A");
    expect(allergenCode(25)).toBe("Z");
    expect(allergenCode(26)).toBe("AA");
    expect(allergenCode(27)).toBe("AB");
  });
});

describe("serving times", () => {
  it("formats clock times", () => {
    expect(formatClock("07:00")).toBe("7:00 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
    expect(formatClock("00:30")).toBe("12:30 AM");
    expect(formatClock("23:15")).toBe("11:15 PM");
  });

  it("groups days", () => {
    expect(formatDays([1, 2, 3, 4, 5])).toBe("Mon–Fri");
    expect(formatDays([1, 3, 5])).toBe("Mon, Wed, Fri");
    expect(formatDays([6, 0])).toBe("Sat, Sun");
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(formatDays([1, 2, 3, 5, 6, 0])).toBe("Mon–Wed, Fri–Sun");
  });

  it("builds the label shown next to a category", () => {
    expect(formatServingTimes([1, 2, 3, 4, 5], "07:00", "11:00")).toBe("Mon–Fri · 7:00 AM–11:00 AM");
    expect(formatServingTimes([], "07:00", "11:00")).toBe("Every day · 7:00 AM–11:00 AM");
    expect(formatServingTimes([6, 0], null, null)).toBe("Sat, Sun · All day");
    expect(formatServingTimes([], null, null)).toBe("");
  });
});
