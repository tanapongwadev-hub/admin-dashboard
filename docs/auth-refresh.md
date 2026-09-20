# Authentication refresh lifecycle

Implemented across admin-dashboard and the sibling cps-api repository on 2026-09-19.

## Flow and ownership

- Browser tokens remain HttpOnly, SameSite=Lax, Secure outside development, host-only, Path=/ cookies. Root scope is necessary for Server Actions at arbitrary page URLs. Cookie expiry follows each JWT exp.
- src/proxy.ts refreshes missing or near-expiry access tokens before page/Action execution and forwards the updated Cookie header to the request as well as Set-Cookie to the browser. It is not an authorization boundary: cps-api validates every API request.
- src/lib/api/client.ts retries exactly once for 401 ACCESS_TOKEN_EXPIRED through auth-recovery.ts. Auth login/selection/refresh/logout endpoints are excluded. Strings and FormData used by current API wrappers are replayable.
- Server Actions persist the rotated cookies directly. A reactive expiry during RSC rendering resumes through /api/auth/refresh because RSC cannot mutate cookies.
- The retry completes before cookie persistence/RSC redirect. A second 401 terminates immediately, preventing a redirect loop when the fresh token is rejected.
- AuthHeartbeat sends only same-origin POST requests based on access expiry (60 seconds before expiration). It exposes only an expiry timestamp. Hidden tabs resume the schedule on visibility change. Web Locks coordinate supported browsers; backend locking remains required.
- Refresh failures with explicit terminal codes clear cookies and return to login. Unknown 401, 403, network errors and 5xx preserve credentials. Transient proxy failures respond 503 rather than executing an action without a recoverable access cookie.
- No mouse/keyboard-driven token extension or new idle timeout is introduced.

## Backend rotation

POST /auth/refresh keeps its existing response envelope and does not require access credentials.
The existing iam.auth_sessions row is locked within a transaction. Current refresh hashes are replaced using Argon2. Session ID stays stable, so existing access tokens do not fail merely because another tab refreshed.

The previous hash is accepted for a bounded 30-second concurrency grace period. Those requests receive the identical successor refresh token, reconstructed from non-secret signed claims using the refresh signing secret. No plaintext refresh token is stored in the database. This deliberately permits duplicate delivery within that short window; reuse after it revokes the session. Transactions return terminal failures before throwing so revocation commits.

Next.js coalesces refresh calls by a SHA-256 key of the incoming refresh token and retains success for five seconds for late requests. This is only an optimization: PostgreSQL locking and identical successor responses handle separate frontend/backend processes. Delays beyond the 30-second grace window can require signing in again; do not make this window unbounded.

JWT_ACCESS_EXPIRES_IN defaults to 15m; JWT_REFRESH_EXPIRES_IN defaults to 7d. New session expiry is derived from the signed refresh token. Rotation preserves that absolute expiry, rather than extending sessions indefinitely. No separate idle-timeout policy is configured.

POST /auth/logout remains supported for live access tokens. Next.js uses POST /auth/logout-refresh with its server-only refresh cookie so logout can revoke a session after access expiry. Revocation is an atomic update. If the API is unavailable, local logout still clears cookies; remote revocation is best effort.

## Deployment and verification

1. Review and apply cps-api migration 1789800000000-AddRefreshRotation before deploying code that queries the new columns. Do not rely on production schema synchronization.
2. Deploy cps-api with the existing distinct access/refresh secrets and 15m/7d configuration, then admin-dashboard.
3. Existing sessions can rotate without logging in again after the migration. Their original session deadline is retained.
4. The Next.js origin must reflect the public HTTPS origin behind a reverse proxy. Auth handlers reject cross-origin requests; backend tokens are sent server-to-server, so browser CORS credentials are not required for this integration.

Tests added but not executed in this implementation turn under AGENTS.md R0:

- Frontend: pnpm test:auth (auth-refresh.test.ts and auth-routes.test.ts).
- Backend: pnpm test -- --runInBand src/modules/auth/auth.service.refresh.spec.ts src/modules/auth/strategies/jwt.strategy.spec.ts.

The added tests cover valid requests, expired access recovery, terminal refresh failures, one retry, endpoint exclusions, ten concurrent calls, shared cookies across request simulations, transient failures, one hour with a controlled clock, reuse detection, session deadlines and logout.
Concurrency unit tests serialize a fake transaction and assert the requested PostgreSQL lock; a real PostgreSQL concurrency test and live multi-tab browser smoke test are still required before production rollout. No migration, live-account mutation, build, lint, typecheck or test execution was performed in this implementation turn.
