import type { Metadata } from "next";
import { ProductsPageContent } from "../products-page-content";

export const metadata: Metadata = { title: "รายการสินค้า" };

export default function ProductsListPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; new?: string; modelId?: string; customerId?: string; productTypeId?: string; locationId?: string; processLineId?: string }>;
}) {
  return (
    <ProductsPageContent
      searchParams={searchParams}
      title="Product Management"
      description="ควบคุมข้อมูลสินค้า แผนสต็อก BOM และกระบวนการผลิตจากจุดเดียว"
    />
  );
}
