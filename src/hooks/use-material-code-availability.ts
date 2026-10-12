"use client";

import { useEffect, useState } from "react";
import { checkMaterialCodeAction } from "@/app/(dashboard)/materials/pc/actions";
import { CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type MaterialCodeAvailability = {
  status: "idle" | "checking" | "available" | "duplicate" | "error";
  message?: string;
};

export function useMaterialCodeAvailability(code: string, excludeId?: string, enabled = true): MaterialCodeAvailability {
  const normalized = code.trim();
  const key = JSON.stringify([normalized.toLowerCase(), excludeId]);
  const eligible = enabled && normalized.length > 0 && normalized.length <= 50;
  const [result, setResult] = useState<(MaterialCodeAvailability & { key: string }) | null>(null);

  useEffect(() => {
    if (!eligible) return;
    let active = true;
    const timeout = setTimeout(async () => {
      setResult({ key, status: "checking" });
      try {
        const response = await checkMaterialCodeAction(normalized, excludeId);
        if (!active) return;
        setResult(response.status === "success"
          ? { key, status: response.available ? "available" : "duplicate" }
          : { key, status: "error", message: response.message });
      } catch {
        if (active) setResult({ key, status: "error", message: CONNECTION_ERROR_MESSAGE });
      }
    }, 400);
    return () => { active = false; clearTimeout(timeout); };
  }, [eligible, normalized, excludeId, key]);

  if (!eligible) return { status: "idle" };
  return result?.key === key ? result : { status: "checking" };
}
