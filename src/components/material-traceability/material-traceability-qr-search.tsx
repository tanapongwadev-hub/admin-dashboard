"use client";

import * as React from "react";
import { Loader2, QrCode, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { traceByQrCodeAction } from "@/app/(dashboard)/materials/materials-report/actions";
import type { DrillTarget } from "@/components/material-traceability/material-traceability-details";

// §12 "Trace by QR" — scan/search a MAIN or SUB QR and jump straight into
// its full traceability detail, independent of whatever filters/page the
// movement table below is currently showing.
export function MaterialTraceabilityQrSearch({ onFound }: { onFound: (target: DrillTarget) => void }) {
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const result = await traceByQrCodeAction(trimmed);
    setLoading(false);
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    if (result.data.qrLevel === "MAIN") {
      onFound({ type: "main-qr", id: result.data.receiving.id });
    } else {
      onFound({ type: "sub-qr", id: result.data.package.id });
    }
    setCode("");
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <QrCode className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
          <Input
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            placeholder="สแกน/ค้นหา MAIN QR หรือ SUB QR..."
            className="pl-9"
            aria-label="ค้นหาด้วย QR Code"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          ค้นหา
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
