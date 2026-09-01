import type { Metadata } from "next";
import { TrendingUp, Users, MousePointerClick, Percent } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { TrafficChart } from "@/components/dashboard/traffic-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { ConversionFunnel } from "@/components/dashboard/conversion-funnel";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Analytics</h1>
        <p className="mt-1 text-sm text-fg-muted">A closer look at growth, engagement and conversion.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Conversion rate" value="3.42%" change="0.6%" trend="up" icon={Percent} accent="chart-1" />
        <StatCard label="Avg. session" value="4m 12s" change="1.2%" trend="up" icon={MousePointerClick} accent="chart-2" />
        <StatCard label="New signups" value="1,204" change="8.9%" trend="up" icon={Users} accent="chart-3" />
        <StatCard label="Growth rate" value="18.2%" change="3.1%" trend="down" icon={TrendingUp} accent="chart-4" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Revenue trend</CardTitle>
              <CardDescription>Monthly revenue vs expenses</CardDescription>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sales by category</CardTitle>
              <CardDescription>Units sold across product categories</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Conversion funnel</CardTitle>
              <CardDescription>From visit to purchase</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ConversionFunnel />
          </CardContent>
        </Card>
      </div>

      <Card>
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
    </div>
  );
}
