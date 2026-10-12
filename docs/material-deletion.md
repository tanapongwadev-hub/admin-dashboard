# Permanent Material deletion

The `/materials/pc` row menu offers **ลบถาวร** to users with `MATERIAL_DELETE` (or SUPER_ADMIN). This is separate from the existing deactivate/restore workflow.

The dialog fetches `GET /materials/:id/deletion-check`, displays code/name/Location Type, and lists blocking references. An unreferenced material requires an exact code confirmation. Blocked active materials offer **ปิดใช้งานแทน**, opening the existing status confirmation dialog.

`DELETE /materials/:id/permanent` accepts `{ confirmationCode: string }`, requires `MATERIAL_DELETE`, and validates a positive bigint id. The existing `DELETE /materials/:id` still deactivates.

The backend locks the Material row and checks all incoming PostgreSQL foreign keys, including cascading and SET NULL relations, before deletion. Any referencing row blocks deletion, including zero stock balance rows and historical BOM/workflow/receiving/disbursement/processing rows. Supplier master mappings are the sole exception: these associations are removed in the same transaction. Uploaded files and separately configured output Materials are retained. Foreign-key constraints remain the final guard against concurrent reference creation.

The transaction also writes `material.permanently_deleted` to Audit with actor and the deleted id/code/name/Location Type. Audit failure rolls back deletion. No migration is needed. Frontend actions invalidate `/materials`, `/materials/pc`, and `/bom-workflow/materials` after success.

Material drafts have no database FK, so deletion explicitly checks `MaterialDraft.materialId`. Draft saving holds a key-share lock on the Material until commit, coordinating with the deletion row lock to prevent orphan drafts.

Source inspected only; tests/lint/build/typecheck were not run under AGENTS R0. Added backend safeguard specs in `src/modules/materials/materials-delete.spec.ts`; recommended targeted command from cps-api when validation is requested: `pnpm exec jest src/modules/materials/materials-delete.spec.ts --runInBand`.
