import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Direction the number moved, and whether that movement is good or bad —
// deliberately two separate props. "Low-stock alerts went UP" is an increase
// (arrow up) but a bad one (red), which a single up/down flag can't express
// without lying about the direction.
export type KpiDirection = "up" | "down" | "flat";
export type KpiSentiment = "positive" | "negative" | "neutral";

export interface KpiDelta {
  value: string;
  direction: KpiDirection;
  sentiment: KpiSentiment;
}

const SENTIMENT_CLASS: Record<KpiSentiment, string> = {
  positive: "bg-success-soft text-success",
  negative: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-fg-secondary",
};

const DIRECTION_ICON: Record<KpiDirection, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

// Hand-rolled inline SVG rather than a recharts <ResponsiveContainer> per card
// — four sparklines are four extra resize observers and chart runtimes for
// ~10 line segments each. Colors come from `currentColor` so the caller sets
// tone with a single text-* class.
function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  className,
  width = 72,
  height = 28,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const line = sparklinePath(values, width, height);
  if (!line) return null;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("shrink-0 overflow-visible", className)}
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={`${line} L${width},${height} L0,${height} Z`} fill="currentColor" opacity={0.1} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  comparison,
  icon: Icon,
  sparkline,
  sparklineClassName,
  alert = false,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: KpiDelta;
  comparison?: string;
  icon: LucideIcon;
  sparkline?: number[];
  sparklineClassName?: string;
  // Draws the icon tile in the warning tone — reserved for a KPI that is
  // itself a problem indicator (e.g. low-stock alerts above zero), never as
  // decoration. Semantic color has to keep meaning something.
  alert?: boolean;
}) {
  const DirectionIcon = delta ? DIRECTION_ICON[delta.direction] : null;

  return (
    <article
      className="group flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.08)]"
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] font-medium leading-tight text-fg-secondary">{label}</p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            alert ? "bg-warning-soft text-warning" : "bg-surface-2 text-fg-secondary"
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </span>
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[30px] font-bold leading-none tracking-[-0.025em] tabular-nums text-fg">{value}</span>
        {unit && <span className="text-sm font-medium text-fg-muted">{unit}</span>}
      </p>

      <div className="mt-3.5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          {delta && DirectionIcon && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                SENTIMENT_CLASS[delta.sentiment]
              )}
            >
              <DirectionIcon className="size-3" aria-hidden="true" />
              {delta.value}
            </span>
          )}
          {comparison && <span className="truncate text-xs text-fg-muted">{comparison}</span>}
        </div>
        {sparkline && sparkline.length > 1 && (
          <Sparkline values={sparkline} className={cn("text-fg-muted", sparklineClassName)} />
        )}
      </div>
    </article>
  );
}
