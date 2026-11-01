"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { MaterialReceiving } from "@/lib/api/materials-receiving";
import { formatNumber } from "@/lib/utils";

// Renders "พิมพ์ QR Code"'s printable content directly in this document and
// calls the browser's own `window.print()` — no `window.open()`, no popup
// window at all. An earlier version opened a separate window via
// `window.open()` + `document.write()`, which got the "การจัดการ" action
// menu stuck open and the page appeared to hang: `window.open()` is only
// reliably treated as a real user-gesture popup when called *synchronously*
// inside the click, but this action fires from inside a Radix
// DropdownMenuItem's `onSelect`, and deferring the call (the first attempted
// fix) breaks that synchronous chain, so browsers silently block/ignore it
// instead — nothing ever opens, and the trigger stays in a stuck-pending
// state. Printing the *current* document via a hidden-until-print overlay
// sidesteps popup rules entirely; see globals.css's `@media print` rule
// that isolates [data-qr-print-sheet], including hiding screen-only
// dialog and toast portals that live outside #dashboard-shell.
//
// Rendered once near the top of materials-receiving-client.tsx and driven
// by a single `printTarget` state — `onDone` (fired on the browser's own
// `afterprint` event, which reliably covers both "printed" and
// "cancelled") clears that state back to null so a later print starts from
// a clean slate.
export function MaterialsReceivingQrPrintSheet({
  receiving,
  onDone,
}: {
  receiving: MaterialReceiving | null;
  onDone: () => void;
}) {
  React.useEffect(() => {
    if (!receiving) return;
    function handleAfterPrint() {
      onDone();
    }
    window.addEventListener("afterprint", handleAfterPrint);
    // rAF, not a same-tick call — gives the browser one paint to lay out the
    // freshly-mounted print content before the print dialog captures it.
    // Wait for the logo to finish loading (the QR images are inline data
    // URLs, the logo is a network file) — printing on the next frame
    // captured the sheet before it arrived, so the logo came out blank.
    let raf = 0;
    let cancelled = false;
    let started = false;
    const startPrint = () => {
      if (cancelled || started) return;
      started = true;
      raf = requestAnimationFrame(() => window.print());
    };
    const logo = new window.Image();
    logo.onload = startPrint;
    logo.onerror = startPrint;
    logo.src = "/cci_logo.png";
    if (logo.complete) startPrint();
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", handleAfterPrint);
      cancelAnimationFrame(raf);
    };
  }, [receiving, onDone]);

  // `receiving` starts (and stays, on the server) null, so this component
  // never touches `document` during SSR — it only becomes non-null via a
  // client-triggered state update in materials-receiving-client.tsx, by
  // which point `document` is guaranteed to exist. No separate "mounted"
  // gate needed (and one would trip this project's set-state-in-effect
  // lint rule anyway).
  if (!receiving) return null;

  const packages = receiving.packages ?? [];

  const supplierLabel = receiving.supplier
    ? (receiving.supplier.nameTh ?? receiving.supplier.nameEn ?? receiving.supplier.code)
    : null;
  const unitLabel =
    receiving.unit?.symbol ?? receiving.unit?.nameTh ?? receiving.unit?.code ?? "หน่วย";
  const materialCode = receiving.material?.code ?? "—";
  const materialName = receiving.material?.name ?? "ไม่ระบุวัสดุ";

  // Same sheet geometry as the production labels: A4 portrait, 10 mm
  // margins, 2 × 4 cut-out labels of 93.5 × 62 mm, 8 per page.
  const pages: (typeof packages)[] = [];
  for (let i = 0; i < packages.length; i += 8) pages.push(packages.slice(i, i + 8));

  return createPortal(
    <div data-qr-print-sheet className="hidden print:block">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          .receiving-qr-page { width: 190mm; break-after: page; break-inside: avoid; }
          .receiving-qr-page:last-child { break-after: auto; }
          .receiving-qr-label { break-inside: avoid; }
        }
      `}</style>
      {pages.map((pagePackages, pageIndex) => (
        <div key={pageIndex} className="receiving-qr-page">
          <div className="grid auto-rows-[62mm] grid-cols-2 gap-[3mm]">
            {pagePackages.map((pkg) => (
              <article
                key={pkg.id}
                className="receiving-qr-label grid h-[62mm] min-w-0 grid-rows-[14mm_minmax(0,1fr)_7mm] gap-[1mm] border border-black bg-white p-[2mm] text-[8pt] leading-tight text-black"
              >
                <header className="flex min-w-0 items-stretch justify-between gap-[2mm] border-b border-black pb-[1mm]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/cci_logo.png"
                    alt="CCI"
                    className="h-[8mm] w-auto shrink-0 self-start object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[11pt] font-bold">{materialCode}</p>
                    <p className="line-clamp-2 text-[8pt]">{materialName}</p>
                  </div>
                  <div className="shrink-0 border-l border-black pl-[2mm] text-right">
                    <p className="text-[16pt] font-bold tabular-nums leading-none">
                      {formatNumber(Number(pkg.quantity))}
                    </p>
                    <p className="mt-[0.5mm] text-[7pt] font-medium">{unitLabel}</p>
                  </div>
                </header>
                <div className="flex min-h-0 items-stretch gap-[3mm]">
                  <div className="flex size-[34mm] shrink-0 items-center justify-center self-center bg-white p-[2mm]">
                    {pkg.qrCode ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pkg.qrCode}
                        alt={`QR ${pkg.lotDetailNo ?? pkg.packageNo}`}
                        className="size-[30mm] object-contain"
                      />
                    ) : (
                      <span className="border border-dashed border-black p-[2mm] text-[7pt]">
                        ไม่มี QR
                      </span>
                    )}
                  </div>
                  <dl className="flex min-w-0 flex-1 flex-col divide-y divide-gray-500">
                    <LabelField label="Supplier" value={supplierLabel} strong />
                    <LabelField label="Lot" value={receiving.internalLotNo} mono strong />
                    <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-gray-500">
                      <LabelField label="Supplier Lot" value={receiving.supplierLotNo ?? "—"} mono />
                      <LabelField
                        label="กล่อง"
                        value={`${pkg.packageNo}/${packages.length}`}
                        padLeft
                      />
                    </div>
                    <LabelField label="รับเข้า" value={receiving.receiveDate} />
                  </dl>
                </div>
                <footer className="min-w-0 border-t border-black pt-[0.8mm]">
                  <p className="break-all font-mono text-[7pt] font-semibold">
                    {pkg.lotDetailNo ?? "—"}
                  </p>
                </footer>
              </article>
            ))}
          </div>
          {pages.length > 1 && (
            <p className="mt-[1mm] text-right text-[7pt]">
              {receiving.internalLotNo} · หน้า {pageIndex + 1}/{pages.length}
            </p>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
}

function LabelField({
  label,
  value,
  mono,
  strong,
  padLeft,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  strong?: boolean;
  padLeft?: boolean;
}) {
  if (!value) return null;
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col justify-center ${padLeft ? "pl-[1.5mm]" : ""}`}
    >
      <dt className="text-[6.5pt] leading-none">{label}</dt>
      <dd
        className={`mt-[0.4mm] break-words leading-tight ${strong ? "text-[9.5pt] font-bold" : "text-[8.5pt] font-medium"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
