"use client";

import * as React from "react";
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { notifications as initialNotifications } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/types";

const typeIcon: Record<NotificationItem["type"], React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

const typeColor: Record<NotificationItem["type"], string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function NotificationsMenu() {
  const [items, setItems] = React.useState(initialNotifications);
  const unread = items.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-fg-secondary" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
          <p className="text-sm font-semibold text-fg">Notifications</p>
          {unread > 0 && (
            <button
              onClick={() => setItems((prev) => prev.map((n) => ({ ...n, read: true })))}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {items.map((n) => {
            const Icon = typeIcon[n.type];
            return (
              <div
                key={n.id}
                className={cn("flex gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2", !n.read && "bg-primary-soft/40")}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", typeColor[n.type])} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{n.description}</p>
                  <p className="mt-1 text-[11px] text-fg-muted">{n.time}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </div>
            );
          })}
        </div>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center text-fg-secondary">
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
