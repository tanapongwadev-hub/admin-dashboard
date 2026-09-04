import type { Metadata } from "next";
import { UsersTable } from "@/components/users/user-table";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">ผู้ใช้งาน</h1>
        <p className="mt-1 text-sm text-fg-muted">จัดการผู้ที่มีสิทธิ์เข้าถึงพื้นที่ทำงานของคุณและสิ่งที่พวกเขาทำได้</p>
      </div>
      <UsersTable openInvite={params.new === "1"} />
    </div>
  );
}
