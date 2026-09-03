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
        <h1 className="text-xl font-semibold text-fg">Users</h1>
        <p className="mt-1 text-sm text-fg-muted">Manage who has access to your workspace and what they can do.</p>
      </div>
      <UsersTable openInvite={params.new === "1"} />
    </div>
  );
}
