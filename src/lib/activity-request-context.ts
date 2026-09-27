import { randomUUID } from "node:crypto";
import { headers } from "next/headers";

export type ActivityRequestContext = {
  correlationId: string;
  requestId: string;
};

const MAX_CONTEXT_ID_LENGTH = 128;
const SAFE_CONTEXT_ID = /^[A-Za-z0-9_-]+$/;

function validContextId(value: string | null): value is string {
  return !!value && value.length <= MAX_CONTEXT_ID_LENGTH && SAFE_CONTEXT_ID.test(value);
}

/**
 * Keeps a single activity correlation across the incoming Next.js request and
 * assigns a fresh request id to every outbound cps-api attempt. The helper is
 * deliberately server-only by usage: apiFetch reads server environment values
 * and is never imported by client components.
 */
export async function createActivityRequestContext(): Promise<ActivityRequestContext> {
  let inboundCorrelationId: string | null = null;

  try {
    inboundCorrelationId = (await headers()).get("x-correlation-id");
  } catch {
    // Scripts and isolated tests can call the API layer without a Next request.
  }

  return {
    correlationId: validContextId(inboundCorrelationId)
      ? inboundCorrelationId
      : randomUUID(),
    requestId: randomUUID(),
  };
}
