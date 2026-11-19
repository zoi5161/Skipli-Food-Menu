import { describe, expect, it } from "vitest";
import { classifySource, clientIp, deviceType, geoFromHeaders, hostOf, utcDay } from "@/lib/analytics/classify";

const OWN = "menu.example.com";

describe("classifySource", () => {
  it("dấu ?src= được ưu tiên", () => {
    expect(classifySource("qr", null, OWN).source).toBe("QR");
    expect(classifySource("QR", "https://www.google.com/", OWN).source).toBe("QR");
    expect(classifySource("ig", null, OWN).source).toBe("INSTAGRAM");
  });
  it("không có nguồn = vào thẳng (gõ link, tin nhắn)", () => {
    expect(classifySource(null, null, OWN)).toEqual({ source: "DIRECT", referrerHost: null });
    expect(classifySource("lạ", "", OWN).source).toBe("DIRECT");
    expect(classifySource(null, "https://menu.example.com/@abc", OWN).source).toBe("DIRECT");
  });
  it("nhận ra Instagram, Facebook, Google", () => {
    expect(classifySource(null, "https://l.instagram.com/?u=x", OWN).source).toBe("INSTAGRAM");
    expect(classifySource(null, "https://www.instagram.com/", OWN).source).toBe("INSTAGRAM");
    expect(classifySource(null, "https://lm.facebook.com/l.php", OWN).source).toBe("FACEBOOK");
    expect(classifySource(null, "https://www.google.com/", OWN).source).toBe("GOOGLE");
    expect(classifySource(null, "https://www.google.co.uk/", OWN).source).toBe("GOOGLE");
    expect(classifySource(null, "https://maps.app.goo.gl/x", OWN).source).toBe("GOOGLE");
  });
  it("trang khác: ghi tên miền", () => {
    expect(classifySource(null, "https://www.yelp.com/biz/x", OWN)).toEqual({ source: "OTHER", referrerHost: "yelp.com" });
    expect(classifySource(null, "https://notgoogle.com/", OWN).source).toBe("OTHER");
  });
  it("bỏ qua địa chỉ lạ", () => {
    expect(hostOf("javascript:alert(1)")).toBeNull();
    expect(hostOf("not a url")).toBeNull();
  });
});

describe("deviceType", () => {
  it("phân biệt điện thoại, máy tính bảng, máy tính", () => {
    expect(deviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148")).toBe("MOBILE");
    expect(deviceType("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36")).toBe("MOBILE");
    expect(deviceType("Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 Chrome/120 Safari/537.36")).toBe("TABLET");
    expect(deviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15")).toBe("TABLET");
    expect(deviceType("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 Chrome/120 Safari/537.36")).toBe("DESKTOP");
  });
});

describe("headers", () => {
  it("lấy IP đầu tiên trong x-forwarded-for", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers())).toBe("unknown");
  });
  it("vị trí cấp thành phố từ Vercel, có giải mã", () => {
    const h = new Headers({ "x-vercel-ip-city": "San%20Jos%C3%A9", "x-vercel-ip-country-region": "CA", "x-vercel-ip-country": "us", "x-vercel-ip-latitude": "37.33939", "x-vercel-ip-longitude": "-121.89496" });
    expect(geoFromHeaders(h)).toEqual({ city: "San José", region: "CA", country: "US", latitude: 37.3, longitude: -121.9 });
    expect(geoFromHeaders(new Headers())).toEqual({ city: null, region: null, country: null, latitude: null, longitude: null });
  });
  it("tọa độ: làm tròn ~10 km, bỏ giá trị sai, thiếu một nửa thì bỏ cả hai", () => {
    expect(geoFromHeaders(new Headers({ "x-vercel-ip-latitude": "91", "x-vercel-ip-longitude": "10" }))).toMatchObject({ latitude: null, longitude: null });
    expect(geoFromHeaders(new Headers({ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "10" }))).toMatchObject({ latitude: null, longitude: null });
    expect(geoFromHeaders(new Headers({ "x-vercel-ip-latitude": "40.71" }))).toMatchObject({ latitude: null, longitude: null });
    expect(geoFromHeaders(new Headers({ "x-vercel-ip-latitude": "-33.868", "x-vercel-ip-longitude": "151.209" }))).toMatchObject({ latitude: -33.9, longitude: 151.2 });
  });
  it("ngày UTC", () => {
    expect(utcDay(new Date("2026-11-19T23:30:00-08:00"))).toBe("2026-11-20");
  });
});
