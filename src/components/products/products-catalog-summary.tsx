import { Building2, CircleCheck, CirclePause, Package } from "lucide-react";
import type { Product } from "@/lib/api/products";
import { cn } from "@/lib/utils";

const cards = [
  { key: "products", label: "สินค้าในผลลัพธ์", icon: Package, tone: "bg-primary-soft text-primary" },
  { key: "active", label: "ใช้งานในผลลัพธ์", icon: CircleCheck, tone: "bg-success-soft text-success-fg" },
  { key: "inactive", label: "ไม่ใช้งานในผลลัพธ์", icon: CirclePause, tone: "bg-warning-soft text-warning-fg" },
  { key: "customers", label: "ลูกค้าในผลลัพธ์", icon: Building2, tone: "bg-info-soft text-info-fg" },
] as const;

export function ProductsCatalogSummary({ totalItems, products }: { totalItems: number; products: Product[] }) {
  const values: Record<(typeof cards)[number]["key"], number> = {
    products: totalItems,
    active: products.filter((product) => product.isActive).length,
    inactive: products.filter((product) => !product.isActive).length,
    customers: new Set(products.map((product) => product.customerId)).size,
  };

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="ภาพรวมแคตตาล็อกสินค้า">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="flex min-h-24 flex-col items-start sm:flex-row sm:items-center gap-3 rounded-lg border border-border bg-surface p-4">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", card.tone)} aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-semibold tabular-nums text-fg">
                {new Intl.NumberFormat("th-TH").format(values[card.key])}
              </span>
              <span className="block text-xs text-fg-muted">{card.label}</span>
            </span>
          </div>
        );
      })}
    </section>
  );
}
