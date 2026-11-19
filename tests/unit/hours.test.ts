import { describe, expect, it } from "vitest";
import { defaultHours, openStatus, parseHours, type WeekHours } from "@/lib/menu/hours";

const at = (h: number, m = 0) => h * 60 + m;
// Thứ hai nghỉ; ngày thường 7:00–21:00; thứ sáu 18:00–02:00 (qua nửa đêm)
const week: WeekHours = [
  { closed: false, from: "08:00", until: "15:00" }, // CN
  { closed: true, from: "07:00", until: "21:00" }, // T2
  { closed: false, from: "07:00", until: "21:00" },
  { closed: false, from: "07:00", until: "21:00" },
  { closed: false, from: "07:00", until: "21:00" },
  { closed: false, from: "18:00", until: "02:00" }, // T6
  { closed: false, from: "08:00", until: "22:00" },
];

describe("openStatus", () => {
  it("đang mở thì báo giờ đóng", () => {
    expect(openStatus(week, 2, at(12))).toEqual({ open: true, headline: "Open now", detail: "until 9:00 PM" });
  });
  it("trước giờ mở trong ngày", () => {
    expect(openStatus(week, 2, at(6, 30))).toEqual({ open: false, headline: "Closed", detail: "opens at 7:00 AM today" });
  });
  it("sau giờ đóng thì báo ngày mở tiếp theo", () => {
    expect(openStatus(week, 0, at(16))).toEqual({ open: false, headline: "Closed", detail: "opens Tuesday at 7:00 AM" });
    expect(openStatus(week, 2, at(22))).toEqual({ open: false, headline: "Closed", detail: "opens tomorrow at 7:00 AM" });
  });
  it("ngày nghỉ", () => {
    expect(openStatus(week, 1, at(12)).open).toBe(false);
  });
  it("ca qua nửa đêm: tối thứ sáu và rạng sáng thứ bảy đều đang mở", () => {
    expect(openStatus(week, 5, at(23, 30))).toEqual({ open: true, headline: "Open now", detail: "until 2:00 AM" });
    expect(openStatus(week, 6, at(1, 15))).toEqual({ open: true, headline: "Open now", detail: "until 2:00 AM" });
    expect(openStatus(week, 6, at(3)).open).toBe(false);
  });
  it("nghỉ cả tuần", () => {
    const closed = week.map((d) => ({ ...d, closed: true }));
    expect(openStatus(closed, 3, at(12))).toEqual({ open: false, headline: "Closed", detail: null });
  });
});

describe("parseHours", () => {
  it("nhận dữ liệu đúng, từ chối dữ liệu sai", () => {
    expect(parseHours(defaultHours())).toHaveLength(7);
    expect(parseHours(null)).toBeNull();
    expect(parseHours([1, 2, 3])).toBeNull();
    expect(parseHours(week.map((d, i) => (i === 2 ? { ...d, from: "25:00" } : d)))).toBeNull();
    expect(parseHours(week.map((d, i) => (i === 2 ? { ...d, from: "09:00", until: "09:00" } : d)))).toBeNull();
    // ngày nghỉ thì không cần giờ hợp lệ
    expect(parseHours(week.map((d, i) => (i === 1 ? { closed: true, from: "", until: "" } : d)))).not.toBeNull();
  });
});
