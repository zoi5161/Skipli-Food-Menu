// Đọc file CSV danh sách nhà hàng (xuất từ Excel / Google Sheets) cho trang Import CSV trong Studio.
// Chạy được ở cả trình duyệt (xem trước) lẫn server (kiểm tra lại trước khi lưu).
import { z } from "zod";
import { US_TIME_ZONES } from "@/lib/timezones";

export const MAX_IMPORT_ROWS = 500;

// ── Một nhà hàng ────────────────────────────────────

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const restaurantInput = z.object({
  name: z.string().trim().min(2, "Name needs at least 2 characters").max(80, "Name is over 80 characters"),
  addressLine: optional(120),
  city: optional(60),
  region: optional(40),
  postalCode: optional(12),
  phone: optional(30),
  website: optional(300).refine((v) => !v || /^https?:\/\/\S+\.\S+/i.test(v), "Website must start with http:// or https://"),
  contactEmail: optional(120).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email looks wrong"),
  timeZone: z.enum(US_TIME_ZONES.map((t) => t.id) as [string, ...string[]]).default("America/New_York"),
});
export type RestaurantInput = z.output<typeof restaurantInput>;

// ── CSV ─────────────────────────────────────────────

/** Tách CSV thành các dòng và ô. Hiểu dấu ngoặc kép ("a, b"), "" bên trong, xuống dòng trong ô, dấu ; hoặc tab. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const sep = [",", ";", "\t"].sort((a, b) => count(b) - count(a))[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Tên cột chấp nhận được (không phân biệt hoa thường, dấu cách, gạch dưới).
const COLUMNS: Record<keyof Omit<RestaurantInput, "timeZone"> | "timeZone", string[]> = {
  name: ["name", "restaurant", "restaurantname", "businessname", "store", "storename"],
  addressLine: ["address", "addressline", "street", "streetaddress", "address1"],
  city: ["city", "town"],
  region: ["state", "region", "province"],
  postalCode: ["zip", "zipcode", "postalcode", "postcode"],
  phone: ["phone", "phonenumber", "tel", "telephone"],
  website: ["website", "url", "web", "site"],
  contactEmail: ["email", "contactemail", "emailaddress"],
  timeZone: ["timezone", "tz"],
};
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

// Múi giờ đoán theo bang khi file không có cột múi giờ (bang trải hai múi giờ thì lấy múi giờ phần đông dân cư).
const STATE_ZONE: Record<string, string> = {
  ...Object.fromEntries("CT DE DC FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV".split(" ").map((s) => [s, "America/New_York"])),
  ...Object.fromEntries("AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI".split(" ").map((s) => [s, "America/Chicago"])),
  ...Object.fromEntries("CO ID MT NM UT WY".split(" ").map((s) => [s, "America/Denver"])),
  AZ: "America/Phoenix",
  ...Object.fromEntries("CA NV OR WA".split(" ").map((s) => [s, "America/Los_Angeles"])),
  AK: "America/Anchorage",
  HI: "Pacific/Honolulu",
};
const ZONE_WORDS: [RegExp, string][] = [
  [/^(e|et|est|edt|eastern)\b/i, "America/New_York"],
  [/^(c|ct|cst|cdt|central)\b/i, "America/Chicago"],
  [/^(arizona|az)\b/i, "America/Phoenix"],
  [/^(m|mt|mst|mdt|mountain)\b/i, "America/Denver"],
  [/^(p|pt|pst|pdt|pacific)\b/i, "America/Los_Angeles"],
  [/^(ak|akst|alaska)\b/i, "America/Anchorage"],
  [/^(h|hst|hawaii)\b/i, "Pacific/Honolulu"],
];

function timeZoneFrom(raw: string | undefined, state: string | undefined): string | undefined {
  const v = raw?.trim();
  if (v) {
    const exact = US_TIME_ZONES.find((z) => z.id.toLowerCase() === v.toLowerCase());
    if (exact) return exact.id;
    for (const [re, id] of ZONE_WORDS) if (re.test(v)) return id;
    return v; // để kiểm tra báo lỗi "múi giờ không hợp lệ"
  }
  return STATE_ZONE[(state ?? "").trim().toUpperCase()];
}

export type CsvRow = { line: number; input?: RestaurantInput; raw: Record<string, string>; errors: string[] };
export type CsvResult = { rows: CsvRow[]; error?: string; unknownColumns: string[] };

/** Đọc cả file: dòng đầu là tên cột, phải có cột tên quán. Mỗi dòng trả lại dữ liệu đã kiểm tra, hoặc lỗi của dòng đó. */
export function readRestaurantCsv(text: string): CsvResult {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], error: "The file is empty", unknownColumns: [] };
  const header = table[0].map(norm);
  const index: Partial<Record<keyof typeof COLUMNS, number>> = {};
  const unknownColumns: string[] = [];
  header.forEach((h, i) => {
    const key = (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).find((k) => COLUMNS[k].includes(h));
    if (key && index[key] === undefined) index[key] = i;
    else if (!key && table[0][i]?.trim()) unknownColumns.push(table[0][i].trim());
  });
  if (index.name === undefined) return { rows: [], error: 'The first row must have column names, with one called "name"', unknownColumns };
  const body = table.slice(1);
  if (body.length === 0) return { rows: [], error: "The file has column names but no restaurants", unknownColumns };
  if (body.length > MAX_IMPORT_ROWS) return { rows: [], error: `Import up to ${MAX_IMPORT_ROWS} restaurants at a time (this file has ${body.length})`, unknownColumns };

  const rows = body.map((cells, n): CsvRow => {
    const get = (k: keyof typeof COLUMNS) => (index[k] === undefined ? undefined : (cells[index[k]!] ?? "").trim());
    const raw = Object.fromEntries((Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).flatMap((k) => (index[k] === undefined ? [] : [[k, get(k) ?? ""]])));
    const parsed = restaurantInput.safeParse({
      name: get("name") ?? "",
      addressLine: get("addressLine"),
      city: get("city"),
      region: get("region"),
      postalCode: get("postalCode"),
      phone: get("phone"),
      website: get("website"),
      contactEmail: get("contactEmail"),
      timeZone: timeZoneFrom(get("timeZone"), get("region")),
    });
    return parsed.success
      ? { line: n + 2, raw, input: parsed.data, errors: [] }
      : { line: n + 2, raw, errors: parsed.error.issues.map((i) => (i.path[0] === "timeZone" ? "Time zone not recognised (use Eastern, Central, Mountain, Pacific…)" : i.message)) };
  });
  return { rows, unknownColumns };
}

/** Khóa so trùng: cùng tên và cùng thành phố (không phân biệt hoa thường, dấu cách thừa). */
export const duplicateKey = (name: string, city: string | null | undefined) => `${name.trim().toLowerCase().replace(/\s+/g, " ")}|${(city ?? "").trim().toLowerCase()}`;
