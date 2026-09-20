"use server";

import { cookies } from "next/headers";
import {
  getMaterialTraceabilityReport,
  traceByQrCode,
  traceMainQr,
  traceSubQr,
  traceReceiving,
  traceDisbursement,
  type ListMaterialTraceabilityParams,
  type MaterialTraceabilityReport,
  type QrTrace,
  type MainQrTrace,
  type DisbursementTrace,
} from "@/lib/api/material-traceability";
import { ApiError } from "@/lib/api/client";
import { redirectIfSessionExpired, redirectMissingSession } from "@/lib/session-expiry";

type Result<T> = { status: "success"; data: T } | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  return store.get("accessToken")?.value ?? null;
}

function errorResult(err: unknown): { status: "error"; message: string } {
  // Session expired mid-action (401) --> sign the user out immediately
  // instead of a dead-end error toast. See lib/session-expiry.ts.
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) {
    const body = err.body as { message?: string | string[] } | undefined;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    if (err.status === 404) return { status: "error", message: message ?? "ไม่พบข้อมูลที่ค้นหา" };
    return { status: "error", message: message ?? "เกิดข้อผิดพลาด กรุณาลองอีกครั้ง" };
  }
  return { status: "error", message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" };
}

// perform* helpers take the accessToken as a parameter (testable without
// mocking next/headers) — same pattern as materials-receiving/actions.ts.

export async function performGetMaterialTraceabilityReport(
  accessToken: string,
  params: ListMaterialTraceabilityParams
): Promise<Result<MaterialTraceabilityReport>> {
  try {
    return { status: "success", data: await getMaterialTraceabilityReport(accessToken, params) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performTraceByQrCode(accessToken: string, code: string): Promise<Result<QrTrace>> {
  try {
    return { status: "success", data: await traceByQrCode(accessToken, code) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performTraceMainQr(accessToken: string, id: string): Promise<Result<MainQrTrace>> {
  try {
    return { status: "success", data: await traceMainQr(accessToken, id) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performTraceSubQr(accessToken: string, id: string) {
  try {
    return { status: "success" as const, data: await traceSubQr(accessToken, id) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performTraceReceiving(accessToken: string, id: string): Promise<Result<MainQrTrace>> {
  try {
    return { status: "success", data: await traceReceiving(accessToken, id) };
  } catch (err) {
    return errorResult(err);
  }
}

export async function performTraceDisbursement(accessToken: string, id: string): Promise<Result<DisbursementTrace>> {
  try {
    return { status: "success", data: await traceDisbursement(accessToken, id) };
  } catch (err) {
    return errorResult(err);
  }
}

// Public wrappers — cookie-reading only, delegate to the perform* helpers.

export async function getMaterialTraceabilityReportAction(params: ListMaterialTraceabilityParams) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performGetMaterialTraceabilityReport(token, params);
}

export async function traceByQrCodeAction(code: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performTraceByQrCode(token, code);
}

export async function traceMainQrAction(id: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performTraceMainQr(token, id);
}

export async function traceSubQrAction(id: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performTraceSubQr(token, id);
}

export async function traceReceivingAction(id: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performTraceReceiving(token, id);
}

export async function traceDisbursementAction(id: string) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();
  return performTraceDisbursement(token, id);
}

// Exports (§15): the frontend re-issues the exact same filter query the
// screen is showing, paginating through cps-api's own page/limit (max 200
// per call — see QueryMaterialTraceabilityDto) until either the data is
// exhausted or a sane page cap is hit, then hands the combined rows back to
// the client for CSV/Excel/PDF generation — the same filter contract as the
// screen, never a second, independently-built export query.
const EXPORT_PAGE_LIMIT = 200;
const EXPORT_MAX_PAGES = 25; // 5,000 rows — generous for a warehouse report

export async function fetchAllMovementsForExportAction(
  params: Omit<ListMaterialTraceabilityParams, "page" | "limit">
) {
  const token = await requireAccessToken();
  if (!token) return redirectMissingSession();

  try {
    const rows: MaterialTraceabilityReport["items"] = [];
    let summary: MaterialTraceabilityReport["summary"] | null = null;
    let page = 1;
    let totalPages = 1;
    let truncated = false;
    while (page <= totalPages && page <= EXPORT_MAX_PAGES) {
      const result = await getMaterialTraceabilityReport(token, { ...params, page, limit: EXPORT_PAGE_LIMIT });
      if (!summary) summary = result.summary;
      rows.push(...result.items);
      totalPages = result.meta.totalPages;
      truncated = truncated || page === EXPORT_MAX_PAGES && page < totalPages;
      page += 1;
    }
    return { status: "success" as const, data: { items: rows, summary: summary!, truncated } };
  } catch (err) {
    return errorResult(err);
  }
}
