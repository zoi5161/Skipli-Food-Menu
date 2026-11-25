import { describe, expect, it } from "vitest";
import { isStaffEmail, staffList } from "@/lib/staff";

describe("staff emails", () => {
  it("đọc danh sách, bỏ khoảng trắng và chữ hoa", () => {
    expect(staffList(" An@Skipli.com, ,@team.io ")).toEqual(["an@skipli.com", "@team.io"]);
    expect(staffList(undefined)).toEqual([]);
  });

  it("khớp đúng email hoặc cả tên miền", () => {
    const raw = "an@skipli.com,@team.io";
    expect(isStaffEmail("AN@skipli.com", raw)).toBe(true);
    expect(isStaffEmail("binh@team.io", raw)).toBe(true);
    expect(isStaffEmail("binh@skipli.com", raw)).toBe(false);
    expect(isStaffEmail("x@notteam.io.evil.com", raw)).toBe(false);
    expect(isStaffEmail("x@evilteam.io", raw)).toBe(false);
  });

  it("chưa cấu hình thì không ai là nhân viên", () => {
    expect(isStaffEmail("an@skipli.com", "")).toBe(false);
    expect(isStaffEmail("", "@team.io")).toBe(false);
  });
});
