import type { Metadata } from "next";
import { MaterialJobOrdersPageContent } from "@/components/material-job-orders/job-orders-page";

export default function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <MaterialJobOrdersPageContent searchParams={searchParams} targetType="material" />;
}

export const metadata: Metadata = { title: "ใบจัดงานวัตถุดิบภายใน" };
