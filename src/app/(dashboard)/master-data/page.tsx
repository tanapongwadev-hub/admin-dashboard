import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Box, FolderTree, MapPin, Route, Ruler, ShieldAlert, Truck, XCircle } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { listCategories } from "@/lib/api/categories";
import { listDeliveryTypes } from "@/lib/api/delivery-types";
import { listLoadingPoints } from "@/lib/api/loading-points";
import { listMaterialModels } from "@/lib/api/material-models";
import { listRejectReasons } from "@/lib/api/reject-reasons";
import { listSuppliers } from "@/lib/api/suppliers";
import { listUnits } from "@/lib/api/units";
import { MasterDataDashboardView, type MasterDataResourceCard } from "@/components/master-data/master-data-dashboard-view";

export const metadata: Metadata = { title: "ข้อมูลหลัก · Master Data" };

// Landing/hub page for the `/master-data` menu item (cps-api code
// `MASTER_DATA`, previously falling through to the `[...rest]` catch-all
// since it had no page of its own — every one of its 7 children already has
// a real CRUD page, see AGENTS.md § Conventions for each). This page fetches
// a cheap `limit: 1` count (total + active) per resource, gated on that
// resource's own real `*_VIEW` permission (same codes each child page
// already gates on — NOT the dotted `*_MANAGEMENT` menu-seed strings), and
// renders a Navy Enterprise-themed directory of cards linking into each one.
export default async function MasterDataDashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
        <ShieldAlert className="size-8 text-fg-muted" aria-hidden="true" />
        <p className="text-lg font-semibold text-fg">คุณไม่มีสิทธิ์เข้าถึงข้อมูลหลัก</p>
      </div>
    );
  }

  const store = await cookies();
  const accessToken = store.get("accessToken")!.value;
  const isSuperAdmin = session.user.isSuperAdmin;
  const has = (code: string) => isSuperAdmin || session.permissions.includes(code);

  const definitions = [
    {
      key: "units",
      name: "หน่วยนับ",
      description: "หน่วยนับที่ใช้อ้างอิงในวัสดุและสินค้า เช่น ชิ้น กิโลกรัม",
      href: "/master-data/units",
      icon: Ruler,
      permission: "UNIT_VIEW",
      list: listUnits,
    },
    {
      key: "suppliers",
      name: "ผู้จัดจำหน่าย",
      description: "ข้อมูลซัพพลายเออร์ที่จัดส่งวัตถุดิบเข้าสู่ระบบ",
      href: "/master-data/suppliers",
      icon: Truck,
      permission: "SUPPLIER_VIEW",
      list: listSuppliers,
    },
    {
      key: "categories",
      name: "หมวดหมู่",
      description: "หมวดหมู่สำหรับจัดกลุ่มข้อมูลภายในระบบ",
      href: "/master-data/categories",
      icon: FolderTree,
      permission: "CATEGORY_VIEW",
      list: listCategories,
    },
    {
      key: "loading-points",
      name: "จุดขนถ่าย",
      description: "จุดขึ้น-ลงสินค้าที่ใช้ในการจัดส่งและรับเข้า",
      href: "/master-data/loading-points",
      icon: MapPin,
      permission: "LOADING_POINT_VIEW",
      list: listLoadingPoints,
    },
    {
      key: "delivery-types",
      name: "ประเภทการจัดส่ง",
      description: "รูปแบบการจัดส่งที่ใช้กำกับเอกสารรับเข้า-จ่ายออก",
      href: "/master-data/delivery-types",
      icon: Route,
      permission: "DELIVERY_TYPE_VIEW",
      list: listDeliveryTypes,
    },
    {
      key: "material-models",
      name: "รุ่นวัสดุ",
      description: "รุ่น/สเปกของวัสดุที่ใช้จำแนกวัตถุดิบ",
      href: "/master-data/material-models",
      icon: Box,
      permission: "MATERIAL_MODEL_VIEW",
      list: listMaterialModels,
    },
    {
      key: "reject-reasons",
      name: "เหตุผลการปฏิเสธ",
      description: "เหตุผลมาตรฐานที่ใช้บันทึกเมื่อปฏิเสธ/คืนวัตถุดิบ",
      href: "/master-data/reject-reasons",
      icon: XCircle,
      permission: "REJECT_REASON_VIEW",
      list: listRejectReasons,
    },
  ] as const;

  const resources: MasterDataResourceCard[] = await Promise.all(
    definitions.map(async (def): Promise<MasterDataResourceCard> => {
      if (!has(def.permission)) {
        return { key: def.key, name: def.name, description: def.description, href: def.href, icon: def.icon, total: null, active: null };
      }
      const [totalPage, activePage] = await Promise.all([
        def.list(accessToken, { page: 1, limit: 1 }),
        def.list(accessToken, { page: 1, limit: 1, isActive: true }),
      ]);
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        href: def.href,
        icon: def.icon,
        total: totalPage.meta.totalItems,
        active: activePage.meta.totalItems,
      };
    })
  );

  return <MasterDataDashboardView resources={resources} />;
}
