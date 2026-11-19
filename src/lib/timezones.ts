// Múi giờ chủ quán chọn được (thị trường Mỹ). Dùng tên chuẩn IANA để database tự tính giờ mùa hè.
export const US_TIME_ZONES = [
  { id: "America/New_York", label: "Eastern (New York, Miami, Atlanta)" },
  { id: "America/Chicago", label: "Central (Chicago, Houston, Dallas)" },
  { id: "America/Denver", label: "Mountain (Denver, Salt Lake City)" },
  { id: "America/Phoenix", label: "Arizona (Phoenix, no daylight saving)" },
  { id: "America/Los_Angeles", label: "Pacific (Los Angeles, Seattle)" },
  { id: "America/Anchorage", label: "Alaska" },
  { id: "Pacific/Honolulu", label: "Hawaii" },
] as const;

export function isTimeZone(v: unknown): v is string {
  return typeof v === "string" && US_TIME_ZONES.some((z) => z.id === v);
}
