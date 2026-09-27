import { apiFetch } from "./client";

export type AuditLogOutcome =
  | "ATTEMPTED"
  | "SUCCESS"
  | "FAILURE"
  | "DENIED"
  | "TIMEOUT";

export interface AuditLogActor {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
}

// This is intentionally the list projection from cps-api, not the detail
// projection. The table never receives beforeData/afterData, which keeps
// sensitive change payloads out of the initial page response.
export interface AuditLogListItem {
  id: string;
  eventId: string;
  eventName: string;
  schemaVersion: number;
  stream: "audit";
  // Runtime API payloads may contain historic or newly-added outcomes before
  // this dashboard is deployed with the matching enum. The UI presents those
  // safely as an unknown outcome rather than trusting this type at runtime.
  outcome?: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  correlationId: string | null;
  occurredAt: string;
  createdAt: string;
  ipAddress: string | null;
  actorUser: AuditLogActor | null;
}

export interface PaginatedAuditLogs {
  items: AuditLogListItem[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
}

function queryString(params: ListAuditLogsParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.size ? `?${query}` : "";
}

// cps-api protects every /audit-logs endpoint with SUPER_ADMIN. The page
// mirrors that gate for a useful UI, but the API remains the authority.
export function listAuditLogs(
  accessToken: string,
  params: ListAuditLogsParams = {},
) {
  return apiFetch<PaginatedAuditLogs>(`/audit-logs${queryString(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
