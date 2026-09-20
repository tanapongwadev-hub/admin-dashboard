import { redirect } from "next/navigation";
import { isTerminalAuthError } from "./auth-refresh";

// apiFetch attempts refresh/retry before these action error guards run.
// Permission failures and transient service outages preserve the session.
export function redirectIfSessionExpired(err: unknown): void {
  if (isTerminalAuthError(err)) {
    redirect("/api/auth/clear-cookies?next=/login");
  }
}

// Proxy has already tried the refresh cookie before the action is dispatched.
export function redirectMissingSession(): never {
  redirect("/api/auth/clear-cookies?next=/login");
}
