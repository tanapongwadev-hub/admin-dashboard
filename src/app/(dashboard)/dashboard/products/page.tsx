import type { Metadata } from "next";
import { ProductsTable } from "@/components/products/product-table";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Products</h1>
        <p className="mt-1 text-sm text-fg-muted">Manage your catalog, pricing and inventory levels.</p>
      </div>
      <ProductsTable openNew={params.new === "1"} />
    </div>
  );
}
