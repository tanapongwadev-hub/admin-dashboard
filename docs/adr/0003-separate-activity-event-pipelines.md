# Separate Audit, Operational, and Analytics event pipelines

**Status**: accepted

The phrase “Activity Log” is an umbrella term, not one storage model. CPS will use three pipelines: authoritative Audit Events for evidence of business/security activity, Operational Events for diagnosis and reliability, and Analytics Events for product-usage analysis. Audit success is decided by `cps-api`; browser events can record intent but cannot claim that a business mutation succeeded. This boundary was chosen over putting every request, click, state change, and stack trace into `iam.audit_logs`, because those records have incompatible trust, volume, retention, access, and failure requirements.

Audit Events use registered, versioned schemas and at-least-once delivery with `eventId` deduplication. Critical business/security events must be written atomically with their mutation or create a durable outbox record in that same transaction; inability to create that evidence rolls back the mutation. Operational and Analytics delivery stays outside the business critical path. All three carry a shared `correlationId`, while each HTTP request also carries its own `requestId`.

**Consequences**: the existing `iam.audit_logs` table and `recordAuditEvent()` are a migration starting point, not a universal event sink. UI clicks, page views, performance data, and stack traces never become authoritative Audit Events. New or changed features must register their events in `docs/activity-logging/event-catalog.md`, classify fields, and satisfy catalog coverage checks before completion. Vendor selection for Operational and Analytics storage remains deferred behind producer/transport interfaces.
