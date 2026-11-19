// Logo + tên thương hiệu, dùng chung cho đầu trang, trang đăng nhập, trang chủ.
// Logo: public/assets/skipli-logo-512.png (logo Skipli, dùng chung với Skipli Content).

export const LOGO_SRC = "/assets/skipli-logo-512.png";

export function Brand({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "sm" ? 24 : 32;
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-tight">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo nhỏ, file tĩnh */}
      <img src={LOGO_SRC} alt="" width={px} height={px} className="shrink-0 rounded-md" />
      <span>
        Skipli<span className="text-brand"> Menu</span>
      </span>
    </span>
  );
}
