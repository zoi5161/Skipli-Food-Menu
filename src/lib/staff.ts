// Ai là nhân viên Skipli: ghi trong biến môi trường STAFF_EMAILS, cách nhau bằng dấu phẩy.
//   STAFF_EMAILS=an@skipli.com, binh@gmail.com     từng email
//   STAFF_EMAILS=@skipli.com                        cả tên miền (mọi email đuôi @skipli.com)
// Nhân viên xem và sửa được mọi quán trong Studio. Người khác chỉ thấy quán đứng tên mình.

export function staffList(raw = process.env.STAFF_EMAILS): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffEmail(email: string | null | undefined, raw = process.env.STAFF_EMAILS): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e.includes("@")) return false;
  return staffList(raw).some((entry) => (entry.startsWith("@") ? e.endsWith(entry) : e === entry));
}
