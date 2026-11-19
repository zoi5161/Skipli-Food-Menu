import { describe, expect, it } from "vitest";
import { readableTextOn } from "@/lib/menu/color";
import { contactLink, formatAddress, headerButtons, phoneDigits, type ContactFields } from "@/lib/menu/contact";
import { parseBlocks } from "@/lib/menu/rich-text";

const base: ContactFields = {
  customLinkLabel: null,
  customLinkUrl: null,
  phone: null,
  whatsapp: null,
  contactEmail: null,
  showDirections: false,
  googleMapsUrl: null,
  addressLine: null,
  city: null,
  region: null,
  postalCode: null,
  primaryButton: "NONE",
  secondaryButton: "NONE",
};

describe("contact buttons", () => {
  it("cleans phone numbers for tel: links", () => {
    expect(phoneDigits("+1 (555) 010-0100")).toBe("+15550100100");
    expect(phoneDigits("555 0100")).toBe("5550100");
  });

  it("formats an address on one line", () => {
    expect(formatAddress({ addressLine: "100 Example St", city: "Springfield", region: "IL", postalCode: "62701" })).toBe(
      "100 Example St, Springfield, IL 62701",
    );
    expect(formatAddress({ addressLine: null, city: "Austin", region: "TX", postalCode: null })).toBe("Austin, TX");
  });

  it("only shows buttons that are filled in", () => {
    expect(contactLink("PHONE", base)).toBeNull();
    expect(contactLink("PHONE", { ...base, phone: "+1 555 0100" })?.href).toBe("tel:+15550100");
    expect(contactLink("WHATSAPP", { ...base, whatsapp: "+1 555 0101" })?.href).toBe("https://wa.me/15550101");
    expect(contactLink("DIRECTIONS", { ...base, city: "Austin" })).toBeNull(); // chưa bật
    expect(contactLink("DIRECTIONS", { ...base, showDirections: true, city: "Austin", region: "TX" })?.href).toContain(
      "destination=Austin%2C%20TX",
    );
    expect(contactLink("DIRECTIONS", { ...base, showDirections: true, googleMapsUrl: "https://maps.app.goo.gl/x" })?.href).toBe(
      "https://maps.app.goo.gl/x",
    );
  });

  it("picks the two header buttons", () => {
    const f = { ...base, phone: "555 0100", contactEmail: "hi@example.com", showDirections: true, city: "Austin" };
    expect(headerButtons(f).map((b) => b.kind)).toEqual(["PHONE", "EMAIL"]); // None → bật đầu tiên
    expect(headerButtons({ ...f, primaryButton: "DIRECTIONS", secondaryButton: "PHONE" }).map((b) => b.kind)).toEqual([
      "DIRECTIONS",
      "PHONE",
    ]);
    // Chọn nút chưa bật thì bỏ qua; không lặp lại cùng một nút
    expect(headerButtons({ ...f, primaryButton: "WHATSAPP", secondaryButton: "PHONE" }).map((b) => b.kind)).toEqual(["PHONE", "EMAIL"]);
    expect(headerButtons(base)).toEqual([]);
  });
});

describe("accent colour", () => {
  it("uses white text on dark colours and black on light ones", () => {
    expect(readableTextOn("#1f4fae")).toBe("#ffffff");
    expect(readableTextOn("#16181d")).toBe("#ffffff");
    expect(readableTextOn("#f5d90a")).toBe("#111111");
  });
});

describe("rich text", () => {
  it("splits paragraphs and lists", () => {
    expect(parseBlocks("Hello\nworld\n\n- a\n- b\n1. one\n2. two")).toEqual([
      { type: "p", lines: ["Hello", "world"] },
      { type: "ul", items: ["a", "b"] },
      { type: "ol", items: ["one", "two"] },
    ]);
  });
});
