# Activity Event Architecture

> **Status**: Accepted design; implementation has not started
> **Date**: 2026-09-26
> **Repos**: Frontend `admin-dashboard` · Backend `cps-api`
> **Decision record**: `docs/adr/0003-separate-activity-event-pipelines.md`
> **Catalog**: `docs/activity-logging/event-catalog.md`

## 1. Objective

CPS must retain meaningful activity across business changes, security activity, system operation, and user interaction without treating every raw browser or HTTP event as the same kind of evidence.

“Complete coverage” means that every registered Event Catalog entry has an owner, producer, versioned schema, field classification, retention rule, delivery class, and automated coverage test. It does not mean copying every request or payload into one database table.

## 2. Canonical streams

| Stream | Purpose | Authority | Typical events | Failure policy | Provisional retention |
| --- | --- | --- | --- | --- | --- |
| Audit | Security/compliance and business evidence | `cps-api` for outcomes; trusted jobs/services for their own work | state changes, auth/security, sensitive reads, exports | direct PostgreSQL Audit rows; critical events share the business transaction where available; no sampling | 3 years |
| Operational | Diagnosis, reliability, performance | emitting service | request timing, dependency failure, worker/queue health, stack traces | async/best-effort; preserve errors and rare events | 90 days |
| Analytics | Product-usage analysis | UI/service telemetry, never a source of business truth | page view, meaningful click, filter, dialog, validation/abandonment | batched/best-effort; policy-based sampling allowed | 13 months |

Retention values are temporary until Legal/Security confirms PDPA, contractual, and audit obligations. Legal hold overrides scheduled deletion.

## 3. Current-state findings

### Backend

- `cps-api/src/entities/iam/audit-log.entity.ts` defines `iam.audit_logs` with actor, department, action, target, before/after JSON, IP, trace/request identifiers, reason, user agent, and timestamp.
- `cps-api/src/common/stock-ledger.ts#recordAuditEvent()` writes within the caller's database transaction. As of 2026-09-26 it assigns Activity Event v1 envelope fields and inherits request context; its action and target unions still cover only receiving, disbursement, production plans, job orders, stock movements, and QR activity.
- Only Materials Receiving, Materials Disbursement, Production Plans, and Material Job Orders currently use that write seam. Auth, sessions, users, RBAC, menus, products, materials, BOM/workflow, departments, and simple master data do not have durable event coverage.
- `cps-api/src/common/interceptors/logging.interceptor.ts` emits structured runtime HTTP metadata. It is not a durable Audit stream and deliberately excludes request/response bodies and query strings.
- `GET /audit-logs` is hard-coded to `SUPER_ADMIN`, has limited filters, and its detail relation can expose fields from the related User entity unless the response is explicitly projected.

### Frontend

- Business mutations use Server Actions and typed `src/lib/api/*` clients, so the frontend can create an intent/correlation context while `cps-api` remains authoritative for the outcome.
- `src/lib/api/client.ts#apiFetch()` is the propagation seam for `correlationId` and per-attempt `requestId`.
- `/audit-logs` is a real Super Admin list page using `src/lib/api/audit-logs.ts`. Its initial server fetch and browser payload use the API's narrow list projection only; action/actor filters and pagination live in the URL. It intentionally does not fetch the detail endpoint or expose `beforeData`/`afterData` in the list view. Unknown or absent outcomes are displayed as a neutral fallback so legacy or staggered backend payloads cannot crash the list.
- Dashboard “recent activity” data is mock presentation data and is not an Audit source.

## 4. Target flow

```text
Browser interaction
  ├─ Analytics producer ──batch/async──► Analytics sink (vendor deferred)
  └─ Server Action intent
       correlationId + requestId
              │
              ▼
          cps-api command
              ├─ business transaction + direct Audit row ────────► Audit store
              ├─ structured request/error/trace event ───────────► Operational sink

Audit store ─► hash chain ─► signed external checkpoint / immutable storage
            └► scoped search, timeline, export, alert and reconciliation
```

The server records `ATTEMPTED`, then one terminal outcome when policy requires attempt visibility. Retried requests share one `correlationId` but receive distinct `requestId` values. Consumers deduplicate by `eventId`.

## 5. Common event envelope

Every registered event has the following envelope. Stream-specific payloads sit under `data` and are validated against the catalog schema.

| Field | Rule |
| --- | --- |
| `eventId` | Globally unique, immutable idempotency key |
| `eventName` | Lowercase domain name such as `production_plan.approved` |
| `schemaVersion` | Integer major version; breaking changes increment it |
| `stream` | `audit`, `operational`, or `analytics` |
| `outcome` | `ATTEMPTED`, `SUCCESS`, `FAILURE`, `DENIED`, `VALIDATION_REJECTED`, `CANCELLED`, or `TIMEOUT` |
| `occurredAt` | UTC time at the trusted producer; untrusted client time is metadata only |
| `recordedAt` | UTC time assigned by the receiving system |
| `correlationId` | One user/business activity across requests, retries, and jobs |
| `requestId` | One HTTP request/attempt; nullable for non-request jobs |
| `causationId` | Event/command that caused this event, when applicable |
| `serviceName` / `serviceVersion` / `environment` | Identifies the producer and deployment |
| `actor` | Structured `actorType`, reference and immutable snapshot |
| `targets` | One primary target plus zero or more related targets |
| `reason` | Required when the catalog marks `reasonRequired` |
| `fieldChanges` | Changed fields only: classification plus redacted/encrypted old/new values |
| `data` | Event-specific allowlisted properties only |

### Actor model

`actorType` is one of `user`, `anonymous`, `system`, `service`, or `integration`. The envelope keeps `initiatedBy`, `executedBy`, and `onBehalfOf` separately. User-backed actors retain both the live reference and a snapshot of user id, username/display label, role, and department at occurrence time.

### Target model

An event has one searchable primary target and optional related targets. Each target carries `targetType`, string `targetId`, and an allowlisted business key such as document number or material code. A free-form JSON target is not a substitute for indexed identity.

## 6. Data policy

### Changed values

Audit mutations store only changed fields, not whole-record snapshots. Each field is classified as:

- `Public`: safe for ordinary display.
- `Internal`: visible to authorized staff.
- `Confidential`: restricted by scope; masked in ordinary views/exports.
- `Restricted`: omitted, one-way hashed, or field-level encrypted according to catalog policy.

Password values, access/refresh tokens, secret keys, cookies, session credentials, and raw authentication material are never retained. A change to one of those fields records the field name and `changed: true`, not either value.

IP address and user agent may be retained in security Audit Events with restricted access and Audit retention. Analytics uses pseudonymous identifiers. Request/response bodies are excluded from Operational Events by default; a catalog allowlist may admit bounded, classified fields. Stack traces stay in the restricted Operational stream and never in Audit payloads.

### Schema evolution

Every payload is schema-validated. Adding an optional property may remain compatible; removing a property, changing its type, or changing its meaning requires a new major `schemaVersion`. Old versions remain interpretable for their full retention period.

## 7. Delivery and consistency

| Delivery class | Use | Required behavior |
| --- | --- | --- |
| `critical_atomic` | high-risk business/security mutations | Audit row is created in the business transaction; failure rolls the mutation back |
| `direct_db` | ordinary application activity | persist the allowlisted event directly to `iam.audit_logs`; no queue, broker, worker, or external sink |
| `best_effort` | Operational and Analytics telemetry | never blocks business work; bounded retry/buffer and explicit drop metrics |

Exactly-once delivery across systems is not a goal. At-least-once plus idempotent consumers is the contract. Audit is never sampled. Operational and Analytics sampling rules must preserve errors, security signals, and rare events and record the applied sampling rate.

## 8. Integrity, retention, and recovery

- Audit records are append-only to application identities. Only the retention service may expire records, subject to legal hold.
- Audit batches maintain a hash chain and periodically publish a signed checkpoint to separate immutable/WORM-capable storage. Verification failures are Critical alerts.
- Production, staging, test, and development use separate stores and credentials. Non-production uses synthetic or anonymized data.
- Audit requires near-zero RPO through transactional persistence and point-in-time recovery. Restore and hash verification are tested periodically.
- Until data residency is approved, data stays in the existing/in-country infrastructure boundary; external vendors remain behind interfaces.

## 9. Access, search, and export

Authorization combines permission and data scope:

- permissions: `AUDIT_LOG_VIEW`, `AUDIT_LOG_VIEW_SENSITIVE`, `AUDIT_LOG_EXPORT`, `AUDIT_LOG_MANAGE_RETENTION`;
- scopes: `OWN`, `DEPARTMENT`, `GLOBAL`.

The initial Audit UI provides server-side pagination and filters for date, actor, department, event, outcome, target, `correlationId`, `requestId`, and sensitivity. Detail shows the actor/target snapshots, field delta, reason, outcome, and correlation timeline. Dashboard and anomaly views follow after enough production data exists.

Sensitive or high-volume export requires approval, bounded date/range and row limits, encryption, watermark/manifest containing exporter identity and query, an expiring download, and an Audit Event. Viewing sensitive payloads, exports, retention/legal-hold changes, and audit-permission changes are themselves audited; ordinary pagination is not.

## 10. Alerts and pipeline health

Alert rules are versioned configuration with owner, severity, acknowledgement, deduplication, and escalation. Initial coverage includes repeated login failure, account lock, token reuse, unusual denial rate, mass deletion/change, stock mismatch, invalid lifecycle transition, rejected schema, event drops, failed retention, failed checkpoint, and reconciliation gaps.

Reconciliation proves that every cataloged critical transaction has its required Audit Event. Health metrics include produced/accepted/rejected/deduplicated/dropped counts, direct-write latency, storage growth, checkpoint age, and retention/restore status.

## 11. Deferred decisions

These do not block the contract-first work but block production sign-off where noted:

1. Legal/Security must confirm PDPA, contractual, audit, legal-hold, and data-subject requirements.
2. Operational and Analytics vendors/stores remain undecided until volume, budget, and residency are known.
3. Measure events/second, average event size, p95/p99 ingestion latency, query latency, and growth before selecting partition/warehouse strategy.
4. Confirm final alert destinations and on-call ownership through the configurable routing layer.

## 12. Completion criteria

The activity-event capability is complete only when:

1. every catalog entry has schema, owner, producer, classification, retention, delivery class, and tests;
2. all critical mutations reconcile to exactly one logical Audit Event despite retries;
3. forbidden-value canary tests prove secrets do not enter any stream;
4. permission/scope tests cover own, department, global, sensitive view, and export;
5. hash/checkpoint verification, retention, legal hold, backup, and restore are exercised;
6. dashboards expose coverage, drops, lag, storage growth, and reconciliation gaps;
7. legacy history is imported only when provenance is provable and otherwise marked `migration.snapshot` at the documented cutover time.
