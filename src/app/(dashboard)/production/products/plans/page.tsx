import type { Metadata } from "next";
import { ProductionPlansPageContent } from "@/components/production-plans/production-plans-page";

export default function ProductProductionPlansPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ProductionPlansPageContent targetType="product" searchParams={searchParams} />;
}
export const metadata: Metadata = { title: "แผนผลิตสินค้า" };
