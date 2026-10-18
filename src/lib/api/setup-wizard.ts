import { apiFetch } from "./client";

export interface SetupDraftSummary {
  id: string;
  title: string;
  step: number;
  updatedAt: string;
}

export interface SetupDraftRecord extends SetupDraftSummary {
  data: Record<string, unknown>;
}

export interface SaveSetupDraftPayload {
  id?: string;
  updatedAt?: string;
  title: string;
  step: number;
  data: Record<string, unknown>;
}

const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export function listSetupDrafts(accessToken: string) {
  return apiFetch<SetupDraftSummary[]>("/setup-wizard/drafts", { headers: auth(accessToken) });
}

export function getSetupDraft(accessToken: string, id: string) {
  return apiFetch<SetupDraftRecord>(`/setup-wizard/drafts/${id}`, { headers: auth(accessToken) });
}

export function saveSetupDraft(accessToken: string, payload: SaveSetupDraftPayload) {
  return apiFetch<SetupDraftRecord>("/setup-wizard/drafts", {
    method: "POST",
    headers: auth(accessToken),
    body: JSON.stringify(payload),
  });
}

export function deleteSetupDraft(accessToken: string, id: string) {
  return apiFetch<{ success: true }>(`/setup-wizard/drafts/${id}`, {
    method: "DELETE",
    headers: auth(accessToken),
  });
}
