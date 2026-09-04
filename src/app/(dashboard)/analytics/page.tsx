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
        <h1 className="text-xl font-semibold text-fg">การวิเคราะห์</h1>
        <p className="mt-1 text-sm text-fg-muted">เจาะลึกการเติบโต การมีส่วนร่วม และอัตราการเปลี่ยนเป็นลูกค้า</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="อัตราการเปลี่ยนเป็นลูกค้า" value="3.42%" change="0.6%" trend="up" icon={Percent} accent="chart-1" />
        <StatCard label="เวลาเฉลี่ยต่อเซสชัน" value="4m 12s" change="1.2%" trend="up" icon={MousePointerClick} accent="chart-2" />
        <StatCard label="ผู้สมัครใหม่" value="1,204" change="8.9%" trend="up" icon={Users} accent="chart-3" />
        <StatCard label="อัตราการเติบโต" value="18.2%" change="3.1%" trend="down" icon={TrendingUp} accent="chart-4" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>แนวโน้มรายได้</CardTitle>
              <CardDescription>รายได้เทียบกับค่าใช้จ่ายรายเดือน</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>แหล่งที่มาของการเข้าชม</CardTitle>
              <CardDescription>ผู้เข้าชมมาจากที่ใด</CardDescription>
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
              <CardTitle>ยอดขายตามหมวดหมู่</CardTitle>
              <CardDescription>จำนวนหน่วยที่ขายในแต่ละหมวดหมู่สินค้า</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>ช่องทางการเปลี่ยนเป็นลูกค้า</CardTitle>
              <CardDescription>ตั้งแต่เข้าชมจนถึงซื้อสินค้า</CardDescription>
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
            <CardTitle>ผลการดำเนินงานรายสัปดาห์</CardTitle>
            <CardDescription>ผู้เข้าชมและยอดขาย 7 วันที่ผ่านมา</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <WeeklyChart />
        </CardContent>
      </Card>
    </div>
  );
}
