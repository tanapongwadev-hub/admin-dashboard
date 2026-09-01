import { UserAvatar } from "@/components/ui/user-avatar";
import { activity } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export function RecentActivity() {
  return (
    <div className="flex flex-col">
      {activity.slice(0, 6).map((item, i) => (
        <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i !== activity.slice(0, 6).length - 1 && (
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
