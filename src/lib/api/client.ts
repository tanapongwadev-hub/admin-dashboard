// Server-only: reads process.env.API_* directly, so only call these
// from Server Components, Route Handlers, or Server Actions.

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function baseUrl() {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error(
      "API_BASE_URL is not set. Copy .env.local.example to .env.local and fill it in."
    );
  }
  return url.replace(/\/$/, "");
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(process.env.API_AUTH_TOKEN
        ? { Authorization: `Bearer ${process.env.API_AUTH_TOKEN}` }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let body: unknown = undefined;
    try {
      body = await res.json();
    } catch {
      // response had no JSON body
    }
    throw new ApiError(
      `API request failed: ${init?.method ?? "GET"} ${path} → ${res.status}`,
      res.status,
      body
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
