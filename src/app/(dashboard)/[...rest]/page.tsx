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
      <p className="text-lg font-semibold text-fg">This page isn&apos;t built yet</p>
      <p className="max-w-sm text-sm text-fg-muted">
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{path}</code> is a
        real menu item your account has permission for, but the page for it
        hasn&apos;t been implemented in this app yet.
      </p>
    </div>
  );
}
