import { Activity } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { floorActivity, type FloorActivityItem } from "@/lib/dashboard-data";
import { DashboardEmptyState } from "@/components/dashboard/chart-card";
import { formatDate } from "@/lib/utils";

// `items` defaults to the same 6-item slice as before; the dashboard passes a
// search-filtered subset so the feed stays consistent with the rest of the page.
export function RecentActivity({ items = floorActivity.slice(0, 6) }: { items?: FloorActivityItem[] }) {
  if (items.length === 0) {
    return (
      <DashboardEmptyState
        icon={Activity}
        title="ไม่มีกิจกรรม"
        description="ไม่มีความเคลื่อนไหวบนพื้นโรงงานที่ตรงกับคำค้นหาปัจจุบัน"
      />
    );
  }

  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i !== items.length - 1 && (
            <span className="absolute left-[15px] top-9 h-[calc(100%-20px)] w-px bg-border" />
          )}
          <UserAvatar name={item.actor} color={item.avatarColor} className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm text-fg-secondary">
              <span className="font-medium text-fg">{item.actor}</span> {item.action}{" "}
              <span className="font-medium text-fg">{item.target}</span>
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">{formatDate(item.time)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
