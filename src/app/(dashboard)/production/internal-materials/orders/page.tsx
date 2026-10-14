import type { Metadata } from "next";
import { ProcessOrdersPageContent } from "@/components/production-orders/process-orders-page";

export default function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <ProcessOrdersPageContent searchParams={searchParams} targetType="material" />;
}

export const metadata: Metadata = { title: "การสั่งผลิตตามกระบวนการวัตถุดิบภายใน" };
