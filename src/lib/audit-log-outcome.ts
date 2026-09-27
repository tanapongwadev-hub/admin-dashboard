import type { BadgeProps } from "@/components/ui/badge";

export interface AuditOutcomePresentation {
  label: string;
  variant: BadgeProps["variant"];
}

const KNOWN_OUTCOMES: Partial<Record<string, AuditOutcomePresentation>> = {
  ATTEMPTED: { label: "กำลังดำเนินการ", variant: "warning" },
  SUCCESS: { label: "สำเร็จ", variant: "success" },
  FAILURE: { label: "ไม่สำเร็จ", variant: "danger" },
  DENIED: { label: "ถูกปฏิเสธ", variant: "danger" },
  TIMEOUT: { label: "หมดเวลา", variant: "warning" },
};

export function getAuditOutcomePresentation(outcome: string | null | undefined) {
  // The API contract currently names five outcomes, but historic rows and
  // staggered backend deployments can still return another value or omit it.
  // Never let an unexpected network value take down the whole Audit page.
  return KNOWN_OUTCOMES[outcome ?? ""] ?? {
    label: "ไม่ทราบผลลัพธ์",
    variant: "neutral" as const,
  };
}
