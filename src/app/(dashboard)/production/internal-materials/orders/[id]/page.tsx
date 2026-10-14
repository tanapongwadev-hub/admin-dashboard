import type { Metadata } from "next";
import { ProductionOrderPageContent } from "@/components/production-orders/production-order-page";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductionOrderPageContent params={params} targetType="material" />;
}
export const metadata: Metadata = { title: "รายละเอียดใบสั่งผลิต" };
