import { Building2, GitBranch, Package, Tags } from "lucide-react";
import type { ProductLookups } from "@/lib/api/products";
import { cn } from "@/lib/utils";

const cards = [
  { key: "products", label: "สินค้าในผลลัพธ์", icon: Package, tone: "bg-primary-soft text-primary" },
  { key: "types", label: "ประเภทสินค้า", icon: Tags, tone: "bg-info-soft text-info" },
  { key: "customers", label: "ลูกค้า", icon: Building2, tone: "bg-success-soft text-success" },
  { key: "lines", label: "สายการผลิต", icon: GitBranch, tone: "bg-warning-soft text-warning" },
] as const;

export function ProductsCatalogSummary({ totalItems, lookups }: { totalItems: number; lookups: ProductLookups }) {
  const values: Record<(typeof cards)[number]["key"], number> = {
    products: totalItems,
    types: lookups.productTypes.length,
    customers: lookups.customers.length,
    lines: lookups.processLines.length,
  };

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="ภาพรวมแคตตาล็อกสินค้า">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="flex min-h-24 items-center gap-3 rounded-md border border-border bg-surface p-4 shadow-sm">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", card.tone)} aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums text-fg">
                {new Intl.NumberFormat("th-TH").format(values[card.key])}
              </span>
              <span className="block truncate text-xs text-fg-muted">{card.label}</span>
            </span>
          </div>
        );
      })}
    </section>
  );
}
