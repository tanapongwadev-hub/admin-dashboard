import { Boxes, ArrowDownToLine, ArrowUpFromLine, TriangleAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { StockMovementChart } from "@/components/dashboard/stock-movement-chart";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { WeeklyThroughputChart } from "@/components/dashboard/weekly-throughput-chart";
import { RecentDocuments, RecentDocumentsFooter } from "@/components/dashboard/recent-documents";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { LowStockWatchlist } from "@/components/dashboard/low-stock-watchlist";
import { dashboardStats } from "@/lib/dashboard-data";
import { formatWeight, formatNumber, cn } from "@/lib/utils";
import { getCurrentSession } from "@/lib/session";

function shiftGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const stats = dashboardStats();
  const session = await getCurrentSession();
  const firstName = session?.user.firstName || session?.user.username || "there";
  const needsAttention = stats.lowStockCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">
            {shiftGreeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Here&apos;s what&apos;s moving on the floor today.</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide",
            needsAttention
              ? "border-warning/30 bg-warning-soft text-warning"
              : "border-success/30 bg-success-soft text-success"
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-70",
                needsAttention ? "bg-warning" : "bg-success"
              )}
            />
            <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", needsAttention ? "bg-warning" : "bg-success")} />
          </span>
          {needsAttention ? `${stats.lowStockCount} MATERIALS NEED ATTENTION` : "ALL LINES NORMAL"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Stock on hand"
          value={formatWeight(stats.stockValue)}
          change="3.1%"
          trend="up"
          icon={Boxes}
          accent="chart-1"
        />
        <StatCard
          label="Received today"
          value={formatWeight(stats.receivedToday)}
          change="8.4%"
          trend="up"
          icon={ArrowDownToLine}
          accent="chart-2"
        />
        <StatCard
          label="Disbursed today"
          value={formatWeight(stats.disbursedToday)}
          change="2.7%"
          trend="down"
          icon={ArrowUpFromLine}
          accent="chart-3"
        />
        <StatCard
          label="Low stock alerts"
          value={formatNumber(stats.lowStockCount)}
          change="1"
          trend={stats.lowStockCount > 0 ? "down" : "up"}
          icon={TriangleAlert}
          accent="chart-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Stock movement</CardTitle>
              <CardDescription>Received vs disbursed, last 14 days</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-fg-secondary">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--chart-2)]" /> Received</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--chart-3)]" /> Disbursed</span>
            </div>
          </CardHeader>
          <CardContent>
            <StockMovementChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Stock by category</CardTitle>
              <CardDescription>Material on hand right now</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent documents</CardTitle>
            <RecentDocumentsFooter />
          </CardHeader>
          <CardContent className="p-0">
            <RecentDocuments />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Floor activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Weekly throughput</CardTitle>
              <CardDescription>Received vs disbursed, this week</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyThroughputChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockWatchlist />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
