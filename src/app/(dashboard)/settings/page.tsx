import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-fg">Settings</h1>
        <p className="mt-1 text-sm text-fg-muted">Manage your profile, workspace preferences and billing.</p>
      </div>
      <Suspense fallback={null}>
        <SettingsTabs />
      </Suspense>
    </div>
  );
}
