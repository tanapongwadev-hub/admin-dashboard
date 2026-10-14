import type { Metadata } from "next";
import { ProductionPlansPageContent } from "@/components/production-plans/production-plans-page";

export default function MaterialProductionPlansPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <ProductionPlansPageContent targetType="material" searchParams={searchParams} />;
}
export const metadata: Metadata = { title: "แผนผลิตวัตถุดิบภายใน" };
