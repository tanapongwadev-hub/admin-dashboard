"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { MaterialReceiving } from "@/lib/api/materials-receiving";

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
// that hides the rest of the app (`#dashboard-shell`) while this is visible.
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
    const raf = requestAnimationFrame(() => window.print());
    return () => {
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
  const materialLabel = receiving.material
    ? `${receiving.material.code} · ${receiving.material.name}`
    : "ไม่ระบุวัสดุ";

  return createPortal(
    <div className="hidden print:block">
      <h1 className="mb-3 text-sm font-semibold text-black">
        QR Code กล่อง — {receiving.internalLotNo} ({materialLabel})
      </h1>
      <div className="grid grid-cols-3 gap-2.5">
        {packages.map((pkg) => (
          <section
            key={pkg.id}
            className="flex flex-col items-center gap-1 break-inside-avoid rounded-lg border border-gray-300 p-2.5 text-center"
          >
            {pkg.qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pkg.qrCode}
                alt={`QR ${pkg.lotDetailNo ?? pkg.packageNo}`}
                className="h-28 w-28"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-md border border-dashed border-gray-300 text-[11px] text-gray-500">
                ไม่มี QR
              </div>
            )}
            <p className="break-all font-mono text-[11px] text-black">{pkg.lotDetailNo ?? "—"}</p>
            <p className="text-[11px] font-semibold text-black">{materialLabel}</p>
            <p className="text-[10px] text-gray-600">
              Box {String(pkg.packageNo).padStart(3, "0")} · {pkg.quantity} หน่วย
            </p>
            <p className="text-[10px] text-gray-600">Lot: {receiving.internalLotNo}</p>
          </section>
        ))}
      </div>
    </div>,
    document.body
  );
}
