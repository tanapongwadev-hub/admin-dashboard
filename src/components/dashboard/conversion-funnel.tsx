import { conversionFunnel } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

export function ConversionFunnel() {
  const max = conversionFunnel[0].value;
  return (
    <div className="flex flex-col gap-3">
      {conversionFunnel.map((stage, i) => {
        const pct = (stage.value / max) * 100;
        const prevPct = i > 0 ? (conversionFunnel[i - 1].value / max) * 100 : 100;
        const dropOff = i > 0 ? (((conversionFunnel[i - 1].value - stage.value) / conversionFunnel[i - 1].value) * 100).toFixed(0) : null;
        return (
          <div key={stage.stage}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-fg-secondary">{stage.stage}</span>
              <div className="flex items-center gap-2">
                {dropOff && <span className="text-xs text-danger">-{dropOff}%</span>}
                <span className="tabular-nums font-medium text-fg">{formatNumber(stage.value)}</span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%`, opacity: 0.4 + (prevPct > 0 ? pct / prevPct : 1) * 0.3 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
