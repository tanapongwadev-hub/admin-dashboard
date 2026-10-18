"use client";

import { useEffect, useState } from "react";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type CodeCheckResult = { status: "success"; available: boolean } | { status: "error"; message: string };

export type CodeAvailability = {
  status: "idle" | "checking" | "available" | "duplicate" | "duplicate-local" | "error";
  message?: string;
};

/**
 * Debounced (400 ms) real-time "is this code free?" check against the server, plus an instant local check
 * against other codes typed on the same form (`otherCodes`). Stale responses are ignored. Used by the
 * setup wizard for new materials and the product; the server stays authoritative at create time.
 */
export function useCodeAvailability(
  code: string,
  check: (code: string) => Promise<CodeCheckResult>,
  otherCodes: string[] = [],
  enabled = true
): CodeAvailability {
  const normalized = code.trim();
  const lower = normalized.toLowerCase();
  const eligible = enabled && normalized.length > 0 && normalized.length <= 50;
  const duplicateLocal = eligible && otherCodes.some((c) => c.trim().toLowerCase() === lower);
  const [result, setResult] = useState<(CodeAvailability & { key: string }) | null>(null);

  useEffect(() => {
    if (!eligible || duplicateLocal) return;
    let active = true;
    const timeout = setTimeout(async () => {
      setResult({ key: lower, status: "checking" });
      try {
        const response = await check(normalized);
        if (!active) return;
        setResult(
          response.status === "success"
            ? { key: lower, status: response.available ? "available" : "duplicate" }
            : { key: lower, status: "error", message: response.message }
        );
      } catch {
        if (active) setResult({ key: lower, status: "error", message: CONNECTION_ERROR_MESSAGE });
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
    // `check` is a stable server action; re-run only when the code itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, duplicateLocal, lower, normalized]);

  if (!eligible) return { status: "idle" };
  if (duplicateLocal) return { status: "duplicate-local" };
  return result?.key === lower ? result : { status: "checking" };
}
