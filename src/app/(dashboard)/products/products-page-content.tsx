import { cookies } from "next/headers";
import { ShieldAlert } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listProducts, getProductLookups } from "@/lib/api/products";
import { ProductsClient } from "@/components/products/products-client";

export async function ProductsPageContent({
  searchParams,
  title,
  description,
}: {
  searchParams: Promise<{ search?: string; status?: string; new?: string }>;
  title: string;
  description: string;
}) {
  const session = await getCurrentSession();
  const canView = !!session && (session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_VIEW"));

  if (!session || !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="h-8 w-8 text-fg-muted" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงหน้าสินค้า</p>
        <p className="max-w-sm text-sm text-fg-muted">
          การดูสินค้าต้องมีสิทธิ์ Products View กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const search = params.search?.trim() || undefined;
  const isActive = params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;

  const [list, lookups] = await Promise.all([
    listProducts(accessToken, { search, isActive, sortBy: "code", sortOrder: "asc" }),
    getProductLookups(accessToken),
  ]);

  const canEdit = session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_CREATE") || session.permissions.includes("PRODUCTS_UPDATE");
  const canDelete = session.user.isSuperAdmin || session.permissions.includes("PRODUCTS_DELETE") || session.permissions.includes("PRODUCTS_RESTORE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
      </div>

      <ProductsClient
        products={list.items}
        totalItems={list.meta.totalItems}
        lookups={lookups}
        canEdit={canEdit}
        canDelete={canDelete}
        openNew={params.new === "1"}
      />
    </div>
  );
}
