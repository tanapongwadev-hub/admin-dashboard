import type { ReactNode } from "react";

/** Explicit groups keep the eleventh label on a new A4 page. */
export function ProductionQrPrintLayout({
  title,
  labels,
}: {
  title: string;
  labels: ReactNode[];
}) {
  const pageCount = Math.ceil(labels.length / 10);
  return (
    <div className="hidden print:block text-black">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; }
          .production-qr-page { width: 190mm; break-after: page; break-inside: avoid; }
          .production-qr-page:last-child { break-after: auto; }
          .production-qr-label { break-inside: avoid; }
        }
      `}</style>
      {Array.from({ length: pageCount }, (_, page) => (
        <section key={page} className="production-qr-page">
          <header className="flex h-[10mm] items-center justify-between gap-2 text-[9pt]">
            <h1 className="font-semibold">{title}</h1>
            <span className="shrink-0 text-[8pt]">หน้า {page + 1}/{pageCount}</span>
          </header>
          <div className="grid grid-cols-2 auto-rows-[49mm] gap-[3mm]">
            {labels.slice(page * 10, (page + 1) * 10)}
          </div>
          <footer className="flex h-[5mm] items-end justify-between text-[7pt]">
            <span>ตัดตามกรอบ แล้วติด QR ที่กล่องชิ้นงาน</span>
            <span>{Math.min(10, labels.length - page * 10)} QR · A4 / ขนาดจริง 100%</span>
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
    <article className="production-qr-label flex min-w-0 flex-col border border-black p-[2mm] text-[8pt] leading-tight">
      <header className="flex min-w-0 items-start justify-between gap-[2mm] border-b border-black/30 pb-[1mm]">
        <div className="min-w-0">
          <p className="break-all font-mono text-[9pt] font-bold">{productCode}</p>
          <p className="line-clamp-2">{productName}</p>
        </div>
        <p className="shrink-0 text-right"><strong className="text-[12pt]">{quantity.toLocaleString("th-TH")}</strong><br />ชิ้น</p>
      </header>
      <div className="flex min-h-0 flex-1 items-center gap-[2mm] py-[1mm]">
        {/* eslint-disable-next-line @next/next/no-img-element -- printable QR data URL */}
        <img src={qrImage} alt={`QR ${qrCode}`} className="size-[28mm] shrink-0 bg-white" />
        <dl className="min-w-0 flex-1 space-y-[0.6mm]">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[6.5pt]">{label}</dt>
              <dd className="break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="border-t border-black/30 pt-[1mm] text-[6.5pt] leading-tight">
        <p className="break-all font-mono">{qrCode}</p>
        <p>ใบสั่งผลิต {orderCode}</p>
      </div>
    </article>
  );
}
