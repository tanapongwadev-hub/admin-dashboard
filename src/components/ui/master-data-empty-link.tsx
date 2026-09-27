"use client";

import Link from "next/link";
import { ArrowUpRight, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export function MasterDataEmptyLink({
  href,
  resourceLabel,
  className,
}: {
  href: string;
  resourceLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-dashed border-warning/60 bg-warning-soft/40 px-3 py-2 text-sm text-fg transition-colors",
        "hover:border-warning hover:bg-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      aria-label={`ยังไม่มี${resourceLabel} ไปเพิ่มข้อมูลที่ Master Data`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Database className="size-4 shrink-0 text-warning" aria-hidden="true" />
        <span className="truncate">ยังไม่มี{resourceLabel} — ไปเพิ่มข้อมูล</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
    </Link>
  );
}
