import { describe, expect, it } from "vitest";
import { duplicateKey, parseCsv, readRestaurantCsv } from "@/lib/studio/restaurant-csv";

describe("parseCsv", () => {
  it("hiểu ngoặc kép, dấu phẩy và xuống dòng trong ô, CRLF, BOM", () => {
    const text = '﻿name,address\r\n"Joe\'s, Diner","12 Main St\nSuite 4"\r\n"Say ""hi""",x\r\n\r\n';
    expect(parseCsv(text)).toEqual([
      ["name", "address"],
      ["Joe's, Diner", "12 Main St\nSuite 4"],
      ['Say "hi"', "x"],
    ]);
  });

  it("nhận dấu ; và tab (Excel ở một số máy)", () => {
    expect(parseCsv("name;city\nA;B")).toEqual([["name", "city"], ["A", "B"]]);
    expect(parseCsv("name\tcity\nA\tB")).toEqual([["name", "city"], ["A", "B"]]);
  });
});

describe("readRestaurantCsv", () => {
  it("đọc tên cột linh hoạt và đoán múi giờ theo bang", () => {
    const r = readRestaurantCsv(
      "Restaurant Name,Street Address,City,State,ZIP,Phone Number,Website,Notes\n" +
        "Sunny Side Pizzeria,10 Oak Ave,Austin,TX,78701,(512) 555-0100,https://sunny.example.com,ignore me\n" +
        "Harbor Noodle Bar,,Seattle,wa,,,,",
    );
    expect(r.error).toBeUndefined();
    expect(r.unknownColumns).toEqual(["Notes"]);
    expect(r.rows[0]).toMatchObject({
      line: 2,
      errors: [],
      input: { name: "Sunny Side Pizzeria", addressLine: "10 Oak Ave", city: "Austin", region: "TX", postalCode: "78701", phone: "(512) 555-0100", website: "https://sunny.example.com", timeZone: "America/Chicago" },
    });
    expect(r.rows[1].input).toMatchObject({ name: "Harbor Noodle Bar", addressLine: null, phone: null, timeZone: "America/Los_Angeles" });
  });

  it("cột múi giờ ghi chữ (Pacific, ET) hoặc tên chuẩn", () => {
    const r = readRestaurantCsv("name,timezone\nA Place,Pacific\nB Place,ET\nC Place,America/Denver\nD Place,Mars");
    expect(r.rows.map((x) => x.input?.timeZone)).toEqual(["America/Los_Angeles", "America/New_York", "America/Denver", undefined]);
    expect(r.rows[3].errors[0]).toMatch(/Time zone/);
  });

  it("báo lỗi từng dòng, không làm hỏng cả file", () => {
    const r = readRestaurantCsv("name,website,email\nOk Cafe,,\nX,notaurl,bad");
    expect(r.rows[0].errors).toEqual([]);
    expect(r.rows[1].line).toBe(3);
    expect(r.rows[1].errors).toEqual(["Name needs at least 2 characters", "Website must start with http:// or https://", "Email looks wrong"]);
  });

  it("thiếu cột tên, file rỗng, quá nhiều dòng", () => {
    expect(readRestaurantCsv("city\nAustin").error).toMatch(/"name"/);
    expect(readRestaurantCsv("").error).toMatch(/empty/);
    expect(readRestaurantCsv("name").error).toMatch(/no restaurants/);
    expect(readRestaurantCsv("name\n" + "Cafe Row\n".repeat(501)).error).toMatch(/up to 500/);
  });

  it("khóa so trùng bỏ qua hoa thường và dấu cách", () => {
    expect(duplicateKey("  Sunny  Side ", "Austin")).toBe(duplicateKey("sunny side", " austin "));
    expect(duplicateKey("Sunny", null)).not.toBe(duplicateKey("Sunny", "Austin"));
  });
});
