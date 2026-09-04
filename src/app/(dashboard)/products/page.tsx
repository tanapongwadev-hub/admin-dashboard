import type { Metadata } from "next";
import { ProductsPageContent } from "./products-page-content";

export const metadata: Metadata = { title: "สินค้า" };

export default function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; new?: string }>;
}) {
  return (
    <ProductsPageContent
      searchParams={searchParams}
      title="สินค้า"
      description="จัดการแคตตาล็อกสินค้า ราคา และระดับสินค้าคงคลัง"
    />
  );
}
