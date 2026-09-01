import { DollarSign, Users, ShoppingBag, PackageX } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { RecentOrders, RecentOrdersFooter } from "@/components/dashboard/recent-orders";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TopProducts } from "@/components/dashboard/top-products";
import { statsFor } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getCurrentSession } from "@/lib/session";

export default async function DashboardPage() {
  const stats = statsFor();
  const session = await getCurrentSession();
  const firstName = session?.user.firstName || session?.user.username || "there";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Good morning, {firstName}</h1>
        <p className="mt-1 text-sm text-fg-muted">Here&apos;s what&apos;s happening with your store today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatCurrency(stats.totalRevenue)}
          change="12.4%"
          trend="up"
          icon={DollarSign}
          accent="chart-1"
        />
        <StatCard
          label="Active users"
          value={formatNumber(stats.activeUsers)}
          change="4.1%"
          trend="up"
          icon={Users}
          accent="chart-2"
        />
        <StatCard
          label="Pending orders"
          value={formatNumber(stats.pendingOrders)}
          change="2.3%"
          trend="down"
          icon={ShoppingBag}
          accent="chart-3"
        />
        <StatCard
          label="Stock alerts"
          value={formatNumber(stats.lowStock)}
          change="6.8%"
          trend="down"
          icon={PackageX}
          accent="chart-4"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Revenue overview</CardTitle>
              <CardDescription>Monthly revenue vs expenses</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-fg-secondary">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--chart-1)]" /> Revenue</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--chart-2)]" /> Expenses</span>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Traffic sources</CardTitle>
              <CardDescription>Where visitors come from</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <TrafficChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <RecentOrdersFooter />
          </CardHeader>
          <CardContent className="p-0">
            <RecentOrders />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
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
              <CardTitle>Weekly performance</CardTitle>
              <CardDescription>Visitors and sales, last 7 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
          </CardHeader>
          <CardContent>
            <TopProducts />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
