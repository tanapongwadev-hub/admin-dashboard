import { Construction } from "lucide-react";

// Catch-all for real, permission-granted menu items (from cps-api's menu
// tree) that don't have a page built yet — keeps the dashboard chrome
// (sidebar/topbar) instead of falling through to the bare root not-found.
// See src/lib/nav.ts#menuHref and AGENTS.md Conventions § Sidebar
// permissions / ADR-004.
export default async function DashboardCatchAllPage({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;
  const path = `/${rest.join("/")}`;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <Construction className="h-8 w-8 text-fg-muted" />
      <p className="text-lg font-semibold text-fg">หน้านี้ยังไม่ได้สร้าง</p>
      <p className="max-w-sm text-sm text-fg-muted">
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{path}</code> เป็น
        เมนูจริงที่บัญชีของคุณมีสิทธิ์เข้าถึง แต่หน้าดังกล่าวยังไม่ได้ถูกพัฒนาในแอปนี้
      </p>
    </div>
  );
}
