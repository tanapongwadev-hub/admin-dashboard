import type { Metadata } from "next";
import { ProductsPageContent } from "../products-page-content";

export const metadata: Metadata = { title: "รายการสินค้า" };

export default function ProductsListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; new?: string }>;
}) {
  return (
    <ProductsPageContent
      searchParams={searchParams}
      title="รายการสินค้า"
      description="จัดการแคตตาล็อกสินค้า ราคา และระดับสินค้าคงคลัง"
    />
  );
}
