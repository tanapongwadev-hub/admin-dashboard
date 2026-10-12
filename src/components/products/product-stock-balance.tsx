import { Badge } from "@/components/ui/badge";
import type { Product } from "@/lib/api/products";

export function formatProductQuantity(value: string | number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(Number(value));
}

export function ProductStockBalance({ product, quantity }: { product: Product; quantity?: string }) {
  const amount = quantity === undefined ? null : Number(quantity);
  const empty = amount === 0;
  const low = amount !== null && amount > 0 && amount < product.minStock;
  const unit = product.unit?.nameTh || product.unit?.nameEn || product.unit?.code;
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-primary/20 bg-primary-soft p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">สินค้าสำเร็จรูปคงเหลือ</p>
        <p className="mt-2 break-words text-4xl font-bold leading-tight tracking-tight tabular-nums text-primary">
          {quantity === undefined ? "—" : formatProductQuantity(quantity)}
          {unit && <span className="ml-1.5 text-xs font-normal text-fg-secondary">{unit}</span>}
        </p>
      </div>
      {amount !== null && <Badge variant={empty ? "neutral" : low ? "warning" : "success"}>{empty ? "หมดสต็อก" : low ? "ต่ำกว่าขั้นต่ำ" : "สต็อกปกติ"}</Badge>}
    </div>
  );
}
