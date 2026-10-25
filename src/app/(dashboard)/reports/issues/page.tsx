import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { IssueReportsClient } from "@/components/issue-reports/issue-reports-client";
import { listIssueReports } from "@/lib/api/issue-reports";
import {
  ISSUE_DOCUMENT_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
} from "@/lib/issue-reports";
import { getCurrentSession } from "@/lib/session";

const PAGE_SIZE = 20;

function pick(
  value: string | undefined,
  list: readonly { value: string }[],
): string | undefined {
  return list.some((item) => item.value === value) ? value : undefined;
}

export default async function IssueReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getCurrentSession();
  const can = (code: string) =>
    !!session && (session.user.isSuperAdmin || session.permissions.includes(code));
  if (!session || !can("ISSUE_REPORT_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">
          คุณไม่มีสิทธิ์ดูรายการแจ้งปัญหา
        </p>
        <p className="max-w-sm text-sm text-fg-muted">
          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์ Issue Report View
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const accessToken = (await cookies()).get("accessToken")!.value;
  const list = await listIssueReports(accessToken, {
    page: Math.max(1, Number(params.page) || 1),
    limit: PAGE_SIZE,
    search: params.search?.trim() || undefined,
    status: pick(params.status, ISSUE_STATUSES),
    documentType: pick(params.documentType, ISSUE_DOCUMENT_TYPES),
    severity: pick(params.severity, ISSUE_SEVERITIES),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">รายการแจ้งปัญหา</h1>
        <p className="mt-1 text-sm text-fg-muted">
          รวมปัญหาที่แจ้งไว้กับเอกสารทุกประเภท (รับเข้า จ่ายออก ใบจัดงาน แผนผลิต ใบสั่งขาย ฯลฯ)
          พร้อมติดตามสถานะการแก้ไข
        </p>
      </div>
      <IssueReportsClient
        reports={list.items}
        meta={list.meta}
        summary={list.summary}
        canCreate={can("ISSUE_REPORT_CREATE")}
        canUpdate={can("ISSUE_REPORT_UPDATE")}
      />
    </div>
  );
}

export const metadata: Metadata = { title: "รายการแจ้งปัญหา" };
