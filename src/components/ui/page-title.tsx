import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared heading for screen pages; printed document headings own their sizing. */
export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn("text-2xl font-semibold leading-tight tracking-tight text-fg", className)}
      {...props}
    />
  );
}
