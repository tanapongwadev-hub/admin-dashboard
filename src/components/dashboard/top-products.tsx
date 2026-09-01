import { products } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function TopProducts() {
  const top = [...products].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const maxSales = top[0]?.sales ?? 1;

  return (
    <div className="flex flex-col gap-4">
      {top.map((product, i) => (
        <div key={product.id} className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-fg-secondary">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-fg">{product.name}</p>
              <p className="shrink-0 text-sm tabular-nums text-fg-muted">{formatCurrency(product.price)}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(6, (product.sales / maxSales) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-xs text-fg-muted">{formatNumber(product.sales)} sold</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
