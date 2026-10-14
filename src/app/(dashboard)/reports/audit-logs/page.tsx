import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { AuditLogsView } from "@/components/audit-logs/audit-logs-view";
import { listAuditLogs } from "@/lib/api/audit-logs";
import { getCurrentSession } from "@/lib/session";

const PAGE_SIZE = 20;

// The matching cps-api controller applies JwtAuthGuard, RolesGuard, and a
// SUPER_ADMIN role requirement to both list and detail endpoints. Keep the
// friendly gate here, but do not treat it as authorization authority.
export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; userId?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">ต้องใช้สิทธิ์ Super Admin</p>
        <p className="max-w-sm text-sm text-fg-muted">
          บันทึกการใช้งานอาจมีข้อมูลการดำเนินงานที่ละเอียดอ่อน จึงเปิดดูได้เฉพาะบัญชี Super Admin เท่านั้น
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const accessToken = (await cookies()).get("accessToken")!.value;
  const auditLogs = await listAuditLogs(accessToken, {
    page: Math.max(1, Number(params.page) || 1),
    limit: PAGE_SIZE,
    action: params.action?.trim() || undefined,
    userId: params.userId?.trim() || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">บันทึกการใช้งาน</h1>
        <p className="mt-1 text-sm text-fg-muted">
          ตรวจสอบเหตุการณ์ที่ระบบบันทึกไว้ พร้อมผู้ดำเนินการ เป้าหมาย และผลลัพธ์ของแต่ละรายการ
        </p>
      </div>
      <AuditLogsView auditLogs={auditLogs} />
    </div>
  );
}

export const metadata: Metadata = { title: "บันทึกการใช้งาน" };
