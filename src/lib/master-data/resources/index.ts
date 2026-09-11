import { categoryResource } from "./category";
import { loadingPointResource } from "./loading-point";
import { deliveryTypeResource } from "./delivery-type";
import { rejectReasonResource } from "./reject-reason";
import { materialModelResource } from "./material-model";
import { supplierResource } from "./supplier";
import { unitResource } from "./unit";
import { statusResource } from "./status";
import type { MasterDataResourceConfig } from "@/lib/master-data/types";

// Registry keyed by `resource.key`. Exists ONLY so client components can
// resolve a resource descriptor from a plain string prop instead of
// receiving the descriptor object itself as a prop from a Server
// Component — the descriptor's `actions`/`list`/`tableRender`/`heroBadge`/
// `detailValue` fields are plain functions, and React forbids passing
// non-Server-Action functions as props across the server→client boundary
// ("Functions cannot be passed directly to Client Components..."). A
// Server Component (e.g. `generic-page.tsx`) can still import and use a
// resource module directly for its own server-side work (permission
// checks, calling `resource.list(...)`) — that never serializes the
// descriptor anywhere. Only the client-side orchestrator
// (`generic-client.tsx`) needs this registry, resolving its own
// `resourceKey` prop back into the real descriptor via a plain import,
// which is client-to-client (no RSC boundary involved) same as any other
// module import in a "use client" file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const masterDataResources: Record<string, MasterDataResourceConfig<any>> = {
  [categoryResource.key]: categoryResource,
  [loadingPointResource.key]: loadingPointResource,
  [deliveryTypeResource.key]: deliveryTypeResource,
  [rejectReasonResource.key]: rejectReasonResource,
  [materialModelResource.key]: materialModelResource,
  [supplierResource.key]: supplierResource,
  [unitResource.key]: unitResource,
  [statusResource.key]: statusResource,
};
