import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cardStyles } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// One wrapper for every panel on the dashboard so title/description weight,
// padding, border, and hover treatment can't drift card to card. Built on the
// shared cardStyles from ui/card.tsx rather
// than a second card language — this one just adds the dashboard's header /
// body / footer slots.
export function ChartCard({
  title,
  description,
  actions,
  footer,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: string;
  // Right side of the header — a legend, a badge, a filter, a link.
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        cardStyles,
        "flex min-w-0 flex-col",
        className
      )}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug text-fg">{title}</h2>
          {description && <p className="mt-1 text-sm leading-snug text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">{actions}</div>}
      </header>

      <div className={cn("min-w-0 flex-1 px-5 py-4", bodyClassName)}>{children}</div>

      {footer && (
        <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-5 py-3">{footer}</footer>
      )}
    </section>
  );
}

// A single legend swatch — used in chart card headers and footers so the
// "what does this color mean" affordance is identical everywhere.
export function ChartLegendItem({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-fg-secondary">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
      {value && <span className="font-semibold tabular-nums text-fg">{value}</span>}
    </span>
  );
}

// Shown whenever a filter combination yields nothing. Text-first (not an
// empty chart frame) so it's obvious the panel is empty *because of the
// filters*, not because it failed to load.
export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-4 py-10 text-center", className)}>
      <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-fg-muted" aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="max-w-xs text-xs leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
