import type { ReactNode } from "react";

const LABELS_PER_PAGE = 8;

/** Two columns × four rows: each cut-out label is 93.5 × 62 mm. */
export function ProductionQrPrintLayout({
  title,
  labels,
}: {
  title: string;
  labels: ReactNode[];
}) {
  const pageCount = Math.ceil(labels.length / LABELS_PER_PAGE);
  return (
    <div data-qr-print-sheet className="hidden print:block text-black">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .production-qr-page { width: 190mm; break-after: page; break-inside: avoid; }
          .production-qr-page:last-child { break-after: auto; }
          .production-qr-label { break-inside: avoid; color: black; background: white; }
        }
      `}</style>
      {Array.from({ length: pageCount }, (_, page) => (
        <section key={page} className="production-qr-page">
          <header className="flex h-[8mm] items-center justify-between gap-2 text-[9pt]">
            <h1 className="font-semibold">{title}</h1>
            <span className="shrink-0 text-[8pt]">หน้า {page + 1}/{pageCount}</span>
          </header>
          <div className="grid grid-cols-2 auto-rows-[62mm] gap-[3mm]">
            {labels.slice(page * LABELS_PER_PAGE, (page + 1) * LABELS_PER_PAGE)}
          </div>
          <footer className="flex h-[5mm] items-end justify-between text-[7pt]">
            <span>ตัดตามกรอบ · ป้าย 93.5 × 62 มม.</span>
            <span>{Math.min(LABELS_PER_PAGE, labels.length - page * LABELS_PER_PAGE)} ป้าย · A4 / ขนาดจริง 100%</span>
          </footer>
        </section>
      ))}
    </div>
  );
}

export function ProductionQrLabel({
  qrImage,
  qrCode,
  productCode,
  productName,
  orderCode,
  quantity,
  fields,
}: {
  qrImage: string;
  qrCode: string;
  productCode: string;
  productName: string;
  orderCode: string;
  quantity: number;
  fields: Array<{ label: string; value: string }>;
}) {
  return (
    <article className="production-qr-label grid h-[62mm] min-w-0 grid-rows-[14mm_minmax(0,1fr)_7mm] gap-[1mm] border border-black bg-white p-[2mm] text-black text-[8pt] leading-tight">
      <header className="flex min-w-0 items-start justify-between gap-[2mm] border-b border-black pb-[1mm]">
        <div className="min-w-0 flex-1">
          <p className={`break-all font-mono font-bold leading-tight ${productCode.length > 22 ? "text-[9pt]" : "text-[12pt]"}`}>{productCode || "—"}</p>
          <p className={`text-[8.5pt] font-medium leading-tight ${productCode.length > 30 ? "line-clamp-1" : "line-clamp-2"}`}>{productName || "ไม่ระบุชื่อชิ้นงาน"}</p>
        </div>
        <div className="shrink-0 border-l border-black pl-[2mm] text-right">
          <p className="text-[6.5pt]">จำนวน</p>
          <p className={`font-bold leading-none tabular-nums ${quantity >= 100000 ? "text-[14pt]" : "text-[20pt]"}`}>{quantity.toLocaleString("th-TH")}</p>
          <p className="mt-[0.5mm] text-[7pt] font-medium">ชิ้น</p>
        </div>
      </header>
      <div className="flex min-h-0 items-center gap-[3mm]">
        <div className="flex size-[34mm] shrink-0 items-center justify-center bg-white p-[2mm]">
          {/* Keep a white quiet zone separate from borders and text. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- printable QR data URL */}
          <img src={qrImage} alt={`QR ${qrCode}`} className="size-[30mm] object-contain" />
        </div>
        <dl className="min-w-0 flex-1 space-y-[1mm]">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[6.5pt]">{label}</dt>
              <dd className="break-words text-[8pt] font-bold leading-tight">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>
      <footer className="min-w-0 border-t border-black pt-[0.8mm] leading-tight">
        <div className="flex items-baseline justify-between gap-[2mm] text-[6.5pt]">
          <span className="shrink-0">CPS · ใบสั่งผลิต</span>
          <span className="break-all text-right font-mono font-semibold">{orderCode}</span>
        </div>
        <p className="mt-[0.5mm] break-all font-mono text-[6.5pt]">{qrCode}</p>
      </footer>
    </article>
  );
}
