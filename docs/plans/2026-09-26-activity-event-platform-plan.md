# Implementation Plan — Activity Event Platform

> **Status**: Phase 0 foundation and the existing inventory Audit write seam are implemented; remaining phases are pending
> **Date**: 2026-09-26
> **Repos**: Backend `D:\project-cps\New\cps-api` · Frontend `D:\project-cps\New\admin-dashboard`
> **Read first**: `CONTEXT.md`, `docs/adr/0003-separate-activity-event-pipelines.md`, `docs/activity-logging/architecture.md`, `docs/activity-logging/event-catalog.md`

## 1. Delivery strategy

Implement contract-first and in phases. Each phase closes its own security/coverage gaps before the next producer family is added. Operational and Analytics vendor selection is intentionally postponed; adapters must not leak vendor types into domain services or UI components.

### Implemented on 2026-09-26

- `admin-dashboard` now sends `X-Correlation-Id` and a fresh `X-Request-Id` for every `apiFetch` attempt, including the single token-refresh retry.
- `cps-api` validates or creates those identifiers, returns them in response headers, and makes them available to structured Operational logging and the existing transaction-local Audit seam.
- `LoggingInterceptor` now writes allowlisted metadata only; it no longer logs request/response bodies or query strings.
- Migration `1790500000000-AddActivityEventEnvelope` upgrades `iam.audit_logs` in place and backfills legacy evidence. Existing Materials Receiving, Materials Disbursement, Production Plan, and Material Job Order producers now emit an Activity Event v1 envelope without changing their business transactions.
- Audit read responses explicitly project actor fields and recursively redact sensitive keys rather than serializing the entire User entity.
- `auth.account.locked`, refresh-token reuse detection, backend logout/session revocation, login attempts/outcomes, department selection, and successful session refreshes now write direct PostgreSQL Audit events. The user explicitly chose ordinary log storage rather than a queue/outbox; delivery workers, brokers, and external sinks are out of scope.

## 2. Phase 0 — Baseline, safety, and measurable coverage

### Backend (`cps-api`)

1. Project the Audit API response into explicit DTOs so the User relation cannot serialize `passwordHash` or unrelated user fields.
2. Replace shallow request-body denylisting in `LoggingInterceptor` with metadata-only structured Operational events and endpoint/property allowlists.
3. Add request context middleware/interceptor that validates or creates `correlationId` and creates a unique `requestId`; expose both to guards, filters, services, and logs.
4. Convert `docs/activity-logging/event-catalog.md` into a validated catalog/schema package or generated artifact that both repos consume without duplicating definitions.
5. Produce the initial coverage matrix from backend controllers, scheduled jobs, and frontend Server Actions. Mark every row `missing`, `implemented`, or `not_applicable`; do not infer coverage from HTTP logging.
6. Capture baseline volume, payload-size, p95/p99 latency, error rate, and current Audit growth before migrations.

### Frontend (`admin-dashboard`)

1. Extend `src/lib/api/client.ts` to propagate a caller-provided/generated `correlationId` and a fresh `requestId` for every request/retry attempt.
2. Add a server-only activity context helper for Server Actions. Do not expose tokens or authoritative success emission to client components.

### Exit criteria

- secret-canary tests prove nested passwords/tokens never reach Audit or Operational output;
- every existing controller/action appears in the coverage report;
- correlation is visible from Server Action through API request/error logs;
- baseline metrics and provisional capacity assumptions are recorded.

## 3. Phase 1 — Audit v2 foundation and P0 producers

### Schema and write path

1. Add an append-only Audit v2 schema/envelope supporting event id/name/version, outcome, occurred/recorded times, correlation/request/causation ids, service/environment, structured actor snapshots, string primary/related targets, classified changed fields, reason, and metadata.
2. Preserve existing `iam.audit_logs` during migration. Map provable historical records to v2; mark synthetic baselines `migration.snapshot`; publish an explicit `cutoverAt`.
3. Implement the three delivery classes:
   - `critical_atomic`: Audit/outbox write in the business transaction;
   - `durable_async`: transactional/durable queue with at-least-once delivery;
   - `best_effort`: bounded non-blocking telemetry.
4. Add unique `eventId` deduplication, outbox leasing/retry/dead-letter behavior, and producer/schema validation.
5. Add the field-policy engine (`plain`, `mask`, `hash`, `encrypt`, `omit`) with key rotation and stable policy versions.

### P0 producer coverage

Implement cataloged events for:

- login, failure, lock, department selection, refresh/reuse detection, revoke, and logout;
- users, roles, permissions, departments/assignments, and menus;
- Materials Receiving, Materials Disbursement, Production Plans/reservations, Job Orders, stock movements, and QR lifecycle.

Existing inventory audit calls must migrate through an adapter so current transactionality remains intact while event names and actor/target context are upgraded.

### Exit criteria

- every P0 mutation is `tested` in the coverage matrix;
- a missing `critical_atomic` Audit/outbox write rolls back the mutation;
- retries produce one logical event per `eventId`;
- actor snapshot and initiated/executed/on-behalf-of scenarios are covered;
- reconciliation detects a deliberately removed or duplicated test event.

## 4. Phase 2 — Remaining mutations and sensitive access

1. Add P1 producers for products, materials, BOMs, product workflows, organizations, and every simple-master resource listed in the catalog.
2. Add policy-driven P2 access events for sensitive detail views, reports, downloads, and exports. Do not Audit ordinary pagination/lookups/health requests.
3. Implement Audit self-observation for sensitive payload reveal, export approval/completion, permission, retention, legal hold, integrity, and reconciliation events.
4. Require cataloged reasons for delete, cancel, override, role/permission changes, manual stock adjustment, and impersonation.
5. Complete legacy import only for records with provable provenance; record source and migration manifest hashes.

### Exit criteria

- every mutation endpoint is `tested`, `reconciled`, or owner-approved `not_applicable`;
- sensitive read/export authorization and redaction pass own/department/global tests;
- the legacy cutover report explains every imported and non-imported source.

## 5. Phase 3 — Operational and Analytics pipelines

1. Define producer and transport ports, then select sinks after measured volume, budget, residency, and operational ownership are approved.
2. Emit metadata-only Operational events for HTTP, dependencies, workers, queues, ingestion, retention, checkpoint, and restore verification.
3. Add browser Analytics batching with an allowlisted event API, pseudonymous identifiers, bounded retry/buffer, sampling policy, and unload-safe delivery where supported.
4. Instrument only the cataloged meaningful UI events. Never auto-capture DOM events, keystrokes, free-text search, or form payloads.
5. Record sampling rates and dropped-event metrics so reports remain interpretable.

### Exit criteria

- business request p95/p99 meets the agreed budget with external sinks unavailable;
- Operational/Analytics outages do not fail business mutations;
- rejected/dropped/buffered event metrics and alerts are observable;
- analytics property tests reject undeclared and restricted fields.

## 6. Phase 4 — Audit API and Admin Dashboard

### Backend

1. Replace hard-coded `SUPER_ADMIN` access with permission plus `OWN`/`DEPARTMENT`/`GLOBAL` scope evaluation.
2. Add DTO-validated, capped server-side filters for date, actor, department, event, outcome, target, correlation/request id, and sensitivity.
3. Add correlation timeline/detail endpoints using explicit response projections and field-level reveal authorization.
4. Implement asynchronous export jobs with approval, bounded manifests, row/date limits, encryption, watermark, expiry, and download auditing.

### Frontend

1. Build `/audit-logs` as a Server Component + Server Actions page following ADR-006 and the canonical URL-filter architecture.
2. Add typed `src/lib/api/audit-logs.ts`, list/detail/timeline UI, sensitivity placeholders, scope-aware actions, and export approval/status flows.
3. Add summary/anomaly dashboards only after representative production data exists; no mock data may be presented as real Audit activity.

### Exit criteria

- permission/scope tests cover list, detail, sensitive reveal, approval, export, retention, and legal hold;
- export artifacts expire and cannot exceed their approved manifest;
- the page remains usable without decrypting fields the viewer cannot access.

## 7. Phase 5 — Integrity, retention, recovery, and alerts

1. Build per-partition/batch hash chaining and publish signed checkpoints to separate immutable/WORM-capable storage.
2. Implement provisional retention: Audit 3 years, Operational 90 days, Analytics 13 months; legal hold suppresses expiration.
3. Add point-in-time recovery, scheduled restore drills, chain verification, and evidence reports.
4. Configure alert rules with owner, severity, acknowledgement, deduplication, routing, and escalation for the catalog's initial conditions.
5. Add dashboards for coverage, volume, lag, rejects, drops, deduplication, storage growth, checkpoint age, retention, restore, and reconciliation.

### Exit criteria

- a tampered/missing test record breaks verification and raises the expected alert;
- retention deletes only eligible records and preserves legal-held records;
- a restore drill meets the agreed Audit RPO/RTO and verifies the restored chain;
- critical alerts route and escalate through the provider-neutral interface.

## 8. Cross-cutting test strategy

Every phase adds targeted tests before its coverage state can advance:

- schema/contract compatibility across supported versions;
- producer outcome and actor/target mapping;
- transaction rollback and outbox persistence;
- retry, deduplication, ordering, and dead-letter behavior;
- field classification, redaction, encryption, and secret canaries;
- permission, scope, sensitive reveal, and export approval;
- retention/legal hold, hash/checkpoint, backup/restore, and reconciliation;
- performance/load tests driven by measured event volume rather than guessed scale.

CI fails when a new mutation/controller/Server Action lacks a catalog decision, when a producer emits an unknown schema version, or when a forbidden-value canary appears in any stream.

## 9. Deferred approvals

Production completion requires explicit decisions from the accountable owners for:

- applicable law, contract, and audit standards;
- final retention and legal-hold policy;
- data residency and external transfer;
- Operational/Analytics/immutable-storage vendors;
- alert routing/on-call ownership;
- measured capacity and query SLA.

Until approved, keep data in the existing infrastructure boundary and use the provisional policies recorded in the architecture spec.
