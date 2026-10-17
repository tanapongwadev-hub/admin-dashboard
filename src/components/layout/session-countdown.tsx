"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

// Counts down to the end of the session (the refresh token's expiry — a hard
// limit, not extended by activity). When it reaches zero the user is signed out
// immediately through the clear-cookies route. `endsAt` is a scheduling hint only;
// the API still enforces the real expiry.
const WARN_MS = 15 * 60_000;
const DANGER_MS = 5 * 60_000;

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function SessionCountdown({ endsAt }: { endsAt: number | null }) {
  // null until mounted so server and client markup match (no Date.now() in render).
  const [remaining, setRemaining] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!endsAt) return;
    let done = false;
    const tick = () => {
      const left = endsAt - Date.now();
      setRemaining(left);
      if (left <= 0 && !done) {
        done = true;
        window.location.assign("/api/auth/clear-cookies?next=/login");
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    // Background tabs throttle timers; re-check as soon as the tab is visible.
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endsAt]);

  if (!endsAt) return null;
  const tone =
    remaining === null
      ? "text-fg-muted"
      : remaining <= DANGER_MS
        ? "border-danger/40 bg-danger-soft text-danger-fg"
        : remaining <= WARN_MS
          ? "border-warning/40 bg-warning-soft text-warning-fg"
          : "text-fg-secondary";

  return (
    <div
      role="timer"
      aria-label="เวลาที่เหลือของเซสชัน"
      title="เวลาที่เหลือก่อนออกจากระบบอัตโนมัติ"
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium tabular-nums",
        tone,
      )}
    >
      <Timer className="size-3.5" aria-hidden="true" />
      <span className="font-mono">{remaining === null ? "--:--:--" : format(remaining)}</span>
    </div>
  );
}
