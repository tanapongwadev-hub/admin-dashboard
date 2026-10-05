# Activity Event Catalog

> **Status**: Initial catalog for implementation planning
> **Naming**: lowercase `domain.entity.action`; outcome is a separate envelope field
> **Source of truth**: update this file before adding or changing an emitted event
> **Current implementation profile**: direct PostgreSQL Audit rows only. Queue/outbox delivery is deferred and no event requires a broker.

## Catalog contract

Every concrete event derived from a family below must declare:

- owner and producing service;
- schema version and allowed properties;
- field classification and transformation (`plain`, `mask`, `hash`, `encrypt`, `omit`);
- actor/target requirements and whether a reason is required;
- delivery class and stream-specific retention;
- accepted outcomes and alert rules;
- producer, contract, authorization, redaction, retry/deduplication, and reconciliation tests.

No password, token, secret, cookie, session credential, raw file, unrestricted request body, or unrestricted free text is an allowed property.

## Audit event families

`P0` must ship first, `P1` is the remainder of authoritative mutation coverage, and `P2` is sensitive access/administration. `critical_atomic` means the business transaction must also create the Audit record or outbox record.

### Authentication and session security — P0

| Event name | Outcomes | Delivery | Primary target | Notes |
| --- | --- | --- | --- | --- |
| `auth.login.attempted` | ATTEMPTED | direct_db | user identifier fingerprint | Anonymous actor allowed; never store submitted password. **Implemented:** SHA-256 fingerprint only, stored directly in Audit. |
| `auth.login.completed` | SUCCESS, FAILURE, DENIED, TIMEOUT | direct_db | user/session | Safe error code only; alert on repeated failure. **Implemented:** success/failure records use direct Audit writes; no credentials enter the payload. |
| `auth.account.locked` | SUCCESS | critical_atomic | user | System or user actor; record rule id. **Implemented:** transaction-local audit write with only attempt count, lock expiry, and rule id. |
| `auth.department.selected` | SUCCESS, DENIED | critical_atomic | department assignment | Snapshot role and department. **Implemented:** selection is recorded after the existing session-creation operation; moving it inside that transaction remains required for full critical-atomic compliance. |
| `auth.session.refreshed` | SUCCESS, FAILURE, DENIED | direct_db | session | Never store access/refresh tokens. **Implemented:** successful rotations store only session ID and a safe rotation flag. |
| `auth.token.reuse.detected` | SUCCESS | critical_atomic | session family | Critical security alert. **Implemented:** the refresh-rotation transaction revokes the session and writes this event together. |
| `auth.session.revoked` | SUCCESS, FAILURE | critical_atomic | session | Includes logout, admin revoke, and security revoke reason. **Implemented for logout:** revocation and audit entry share one transaction. |
| `auth.logout.completed` | SUCCESS, FAILURE | direct_db | session | Local cookie clearing is not backend success. **Implemented for backend logout:** written atomically with session revocation. |

### Identity and access management — P0

| Event family | Concrete actions | Delivery | Reason required |
| --- | --- | --- | --- |
| `iam.user.*` | `created`, `updated`, `deactivated`, `restored`, `password_reset_requested` | critical_atomic | deactivate/reset override |
| `iam.role.*` | `created`, `updated`, `deleted`, `permission_changed` | critical_atomic | permission change/delete |
| `iam.permission.*` | `created`, `updated`, `deleted`, `department_scope_changed` | critical_atomic | yes for access changes |
| `iam.department.*` | `created`, `updated`, `deleted`, `assignment_changed` | critical_atomic | delete/assignment override |
| `iam.menu.*` | `created`, `updated`, `deleted`, `reordered` | critical_atomic | delete |

All IAM events retain immutable actor and target snapshots. Permission-related changes are `Restricted`, create alerts when high-risk capabilities are granted, and are visible only with sensitive-view permission.

### Inventory and production workflows — P0

| Event family | Concrete actions | Delivery | Reason required |
| --- | --- | --- | --- |
| `material_receiving.*` | `created`, `updated`, `confirmed`, `cancelled`, `deleted` | critical_atomic | cancel/delete |
| `material_disbursement.*` | `created`, `updated`, `confirmed`, `cancelled`, `deleted` | critical_atomic | cancel/delete |
| `production_plan.*` | `created`, `imported`, `updated`, `approved`, `cancelled`, `deleted`, `expired`, `reservation_created`, `reservation_released` | critical_atomic | cancel/delete/manual override |
| `material_job_order.*` | `created`, `printed`, `picked`, `issued`, `completed`, `cancelled` | critical_atomic for stock/lifecycle; durable_async for print | cancel/manual override |
| `production_order.*` | `created`, `step_advanced`, `output_recorded`, `remaining_closed`, `packet_split` (legacy PACKET model); `remaining_closed` (LOT: payload adds step, closedQty, reason) and `completed` (LOT: per-line quantity/received/rejected/closed) | critical_atomic | remaining_closed |
| `production.lot.*` | `produced` (Phase 2), `transferred` (Phase 5), `rejected` (Phase 3), `reversed` (Phase 9 — payload adds reversed requestId, required reason, original movements), `fg_received`, `output_closed` (later) | critical_atomic — same transaction as the lot/WIP/ledger writes; payload = lot no, step, qty, production date/shift, origin breakdown | rejected/reversed |
| `production.package.*` | `generated`, `printed`, `voided` (later phases) | critical_atomic when state changes; durable_async for print | voided |
| `inventory.stock.*` | `received`, `issued`, `adjusted`, `reconciled`, `mismatch_detected` | critical_atomic | adjustment/mismatch resolution |
| `inventory.qr.*` | `generated`, `printed`, `scanned`, `invalid_scan` | critical_atomic when state changes; durable_async otherwise | no |

Existing `recordAuditEvent()` calls are migration inputs. Their uppercase generic actions must map to the domain names above without losing the current `traceId` links.

### Product, BOM, workflow, and material master — P1

| Event family | Concrete actions | Delivery | Reason required |
| --- | --- | --- | --- |
| `product.*` | `created`, `updated`, `deactivated`, `restored`, `image_uploaded` | critical_atomic except upload attempt | deactivate |
| `material.*` | `created`, `updated`, `deactivated`, `restored`, `image_uploaded` | critical_atomic except upload attempt | deactivate |
| `bom.*` | `created`, `updated`, `item_added`, `item_removed`, `activated`, `deactivated`, `deleted` | critical_atomic | activate/deactivate/delete |
| `product_workflow.*` | `created`, `updated`, `step_changed`, `activated`, `deactivated`, `image_uploaded` | critical_atomic except upload attempt | activate/deactivate |

File events store safe object metadata and content hash where useful, never file bytes or unrestricted filenames supplied by a user.

### Simple master data — P1

Each resource below implements `<resource>.created`, `.updated`, `.deactivated`, and `.restored`; hard-delete variants, if present, require a reason and Critical classification:

`category`, `customer`, `delivery_type`, `loading_point`, `location`, `material_model`, `material_type`, `process_line`, `process_step`, `product_model`, `product_type`, `reject_reason`, `status_item`, `supplier`, and `unit`.

Organizations and any future generic master-data resource must be added to this list and the automated coverage matrix before its mutation endpoint is considered complete.

### Sensitive reads, exports, and Audit administration — P2

| Event name | Trigger | Delivery | Notes |
| --- | --- | --- | --- |
| `sensitive_record.viewed` | authorized detail view of classified data | durable_async | target type/id and policy id, not response body |
| `report.export.requested` | sensitive or high-volume export request | durable_async | query manifest hash and approval state |
| `report.export.completed` | artifact created/downloaded | durable_async | row count, format, expiry; no artifact contents |
| `audit.sensitive_payload.viewed` | decrypted/unmasked Audit detail | durable_async | audited without recursively logging list pagination |
| `audit.export.approved` | approval decision | critical_atomic | approver snapshot and bounded manifest |
| `audit.export.completed` | expiring artifact issued | durable_async | watermark/manifest id |
| `audit.retention.changed` | policy change | critical_atomic | reason required |
| `audit.legal_hold.changed` | hold created/released | critical_atomic | reason required |
| `audit.permission.changed` | Audit access changed | critical_atomic | reason required |
| `audit.integrity.failed` | hash/checkpoint verification failure | critical_atomic | Critical alert |
| `audit.reconciliation.failed` | required event missing/duplicated | durable_async | Critical alert for P0 gaps |

Ordinary list reads, pagination, health checks, lookup endpoints, and heartbeat refreshes do not create Audit Events. Page usage belongs in Analytics; HTTP health belongs in Operational.

### System, job, and integration activity — P1

| Event family | Examples | Delivery |
| --- | --- | --- |
| `system.job.*` | `started`, `completed`, `failed`, `timed_out` | durable_async; business mutation still emits its own critical event |
| `integration.delivery.*` | `attempted`, `completed`, `failed`, `dead_lettered` | durable_async |
| `migration.snapshot.created` | provable cutover baseline only | critical_atomic |

The actor records `initiatedBy`, `executedBy`, and `onBehalfOf`; jobs do not masquerade as the user who originally scheduled them.

## Operational event families

Operational properties are bounded metadata, never raw bodies by default.

| Event family | Required properties |
| --- | --- |
| `http.request.completed` | service, route template, method, status class, duration, correlation/request ids |
| `http.request.failed` | safe error code, exception class, restricted stack reference, dependency phase |
| `dependency.call.completed` | dependency, operation, outcome, duration, retry count |
| `queue.delivery.completed` | queue/topic, outcome, attempts, age, lag |
| `event.ingestion.rejected` | event name/version, producer, safe validation codes |
| `event.delivery.dropped` | stream, producer, reason, count, sampling policy |
| `audit.checkpoint.completed` | range, chain head, signer key id, immutable object reference |
| `retention.job.completed` | stream, policy version, scanned/deleted/held counts |
| `backup.restore.verified` | store, recovery point, duration, verification outcome |

## Analytics event families

Analytics properties are allowlisted per event and use pseudonymous actor/session identifiers.

| Event name | Meaning | Allowed property examples |
| --- | --- | --- |
| `ui.page.viewed` | a routed page became visible | route template, referrer class, viewport class |
| `ui.action.invoked` | meaningful named action was initiated | feature, action, component type |
| `ui.dialog.opened` / `ui.dialog.closed` | workflow dialog usage | dialog id, close reason, elapsed bucket |
| `ui.filter.applied` | a cataloged filter was applied | filter names/count, never raw free text |
| `ui.validation.rejected` | client validation blocked submission | form id, safe validation codes/count |
| `ui.workflow.abandoned` | started workflow ended without submission | workflow id, stage, elapsed bucket |
| `ui.view_mode.changed` | table/card/list preference changed | feature, from/to mode |
| `ui.error.presented` | safe user-facing failure shown | stable error code, feature, retryable flag |

Raw clicks, mouse movement, keystrokes, DOM events, form values, search text, and response payloads are outside this catalog.

## Coverage matrix

Implementation must generate a machine-checkable matrix with one row per concrete catalog event and these states:

- `missing`: no producer exists;
- `implemented`: producer and schema exist;
- `tested`: producer/contract/redaction/deduplication tests pass;
- `reconciled`: production control proves expected critical events exist;
- `not_applicable`: documented owner-approved exclusion.

Adding a mutation endpoint or Server Action without updating the matrix fails CI. A generic HTTP request log cannot satisfy a business-event row.
