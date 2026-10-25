import { apiFetch } from "./client";

export interface IssueReport {
  id: string;
  reportNo: string;
  documentType: string;
  documentNo: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  reportedByName: string | null;
  reportedByUsername: string | null;
  resolvedByName: string | null;
}

export interface PaginatedIssueReports {
  items: IssueReport[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
  summary: Record<string, number>;
}

export interface ListIssueReportsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  documentType?: string;
  severity?: string;
}

export interface CreateIssueReportPayload {
  documentType: string;
  documentNo: string;
  title: string;
  description?: string;
  severity?: string;
}

function auth(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function listIssueReports(
  accessToken: string,
  params: ListIssueReportsParams = {},
): Promise<PaginatedIssueReports> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return apiFetch<PaginatedIssueReports>(`/issue-reports${qs ? `?${qs}` : ""}`, {
    headers: auth(accessToken),
  });
}

export function createIssueReport(
  accessToken: string,
  payload: CreateIssueReportPayload,
): Promise<IssueReport> {
  return apiFetch<IssueReport>("/issue-reports", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateIssueReport(
  accessToken: string,
  id: string,
  payload: { status: string; resolution?: string },
): Promise<IssueReport> {
  return apiFetch<IssueReport>(`/issue-reports/${id}`, {
    method: "PATCH",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}
