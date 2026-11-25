// Khung mã QR dùng ở Dashboard và Settings → Page (giống 1FoodMenu).
// `version` đổi khi link quán đổi, để ảnh QR trên màn hình không bị trình duyệt giữ bản cũ.

export function QrCard({ restaurantId, slug, publicUrl }: { restaurantId: string; slug: string; publicUrl: string }) {
  const v = encodeURIComponent(slug);
  const qr = `/restaurants/${encodeURIComponent(restaurantId)}/qr`;
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6" aria-labelledby="qr-title">
      <h2 id="qr-title" className="text-xs font-medium tracking-wider text-neutral-500 uppercase">
        QR code
      </h2>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- ảnh SVG tạo động, không cần tối ưu ảnh */}
        <img
          src={`${qr}?format=svg&v=${v}`}
          alt={`QR code that opens ${publicUrl}`}
          width={176}
          height={176}
          className="h-44 w-44 shrink-0 self-center rounded-xl border border-neutral-100 sm:self-start"
          data-testid="qr-image"
        />
        <div className="flex-1 space-y-4">
          <div className="flex gap-2">
            <a href={`${qr}?format=png&download=1&v=${v}`} download className="flex-1 rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark">
              Download PNG
            </a>
            <a href={`${qr}?format=svg&download=1&v=${v}`} download className="rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50">
              SVG
            </a>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wider text-neutral-500 uppercase">Where to put it</p>
            <ul className="mt-2 space-y-1.5 text-sm text-neutral-700">
              {["On the table, printed at any size", "In your Instagram bio and Google listing", "In a WhatsApp reply when someone asks"].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-brand" aria-hidden>
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-neutral-500">PNG for printing and social posts. SVG stays sharp at any size, for your print shop.</p>
        </div>
      </div>
    </section>
  );
}
