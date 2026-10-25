"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createIssueReport,
  updateIssueReport,
  type CreateIssueReportPayload,
} from "@/lib/api/issue-reports";
import { ApiError } from "@/lib/api/client";
import {
  redirectIfSessionExpired,
  redirectMissingSession,
} from "@/lib/session-expiry";
import { apiErrorMessage, CONNECTION_ERROR_MESSAGE } from "@/lib/user-error";

export type IssueReportActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

async function requireAccessToken() {
  const store = await cookies();
  const token = store.get("accessToken")?.value;
  if (!token) redirectMissingSession();
  return token;
}

function errorResult(err: unknown): IssueReportActionResult {
  redirectIfSessionExpired(err);
  if (err instanceof ApiError) {
    return { status: "error", message: apiErrorMessage(err) };
  }
  return { status: "error", message: CONNECTION_ERROR_MESSAGE };
}

function revalidateIssues() {
  try {
    revalidatePath("/reports/issues");
  } catch {
    /* best-effort */
  }
}

export async function createIssueReportAction(
  payload: CreateIssueReportPayload,
): Promise<IssueReportActionResult> {
  const accessToken = await requireAccessToken();
  try {
    await createIssueReport(accessToken, payload);
    revalidateIssues();
    return { status: "success" };
  } catch (err) {
    return errorResult(err);
  }
}

export async function updateIssueReportAction(
  id: string,
  payload: { status: string; resolution?: string },
): Promise<IssueReportActionResult> {
  const accessToken = await requireAccessToken();
  try {
    await updateIssueReport(accessToken, id, payload);
    revalidateIssues();
    return { status: "success" };
  } catch (err) {
    return errorResult(err);
  }
}
