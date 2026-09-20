"use client";

import { useEffect } from "react";

// Receives scheduling metadata only. Neither token is exposed to browser JS.
export function AuthHeartbeat({ expiresAt }: { expiresAt: number | null }) {
  useEffect(() => {
    let stopped = false;
    let deadline = expiresAt ?? Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(refresh, Math.max(1_000, delay));
    };
    const refresh = async () => {
      if (stopped || running) return;
      if (document.visibilityState === "hidden") return;
      running = true;
      try {
        const perform = async () => {
          if (stopped) return;
          const response = await fetch("/api/auth/refresh", {
            method: "POST", credentials: "same-origin", cache: "no-store",
            signal: AbortSignal.timeout(20_000),
          });
          if (stopped) return;
          if (response.status === 401) {
            window.location.assign("/login");
            return;
          }
          if (!response.ok) throw new Error("Refresh unavailable");
          const body = await response.json();
          if (typeof body.expiresAt !== "number") throw new Error("Missing expiry");
          deadline = body.expiresAt;
          schedule(deadline - Date.now() - 60_000);
        };
        if (navigator.locks) await navigator.locks.request("cps-auth-refresh", perform);
        else await perform(); // API transaction also serializes unsupported browsers.
      } catch {
        schedule(15_000); // Transient failures preserve cookies and form state.
      } finally {
        running = false;
      }
    };
    const wake = () => {
      if (document.visibilityState === "visible") schedule(deadline - Date.now() - 60_000);
    };
    schedule(deadline - Date.now() - 60_000);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [expiresAt]);
  return null;
}
