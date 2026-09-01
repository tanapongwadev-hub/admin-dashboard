"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { AccountSettings } from "@/components/settings/account-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { BillingSettings } from "@/components/settings/billing-settings";

const tabs = [
  { value: "profile", label: "Profile" },
  { value: "account", label: "Account" },
  { value: "notifications", label: "Notifications" },
  { value: "security", label: "Security" },
  { value: "billing", label: "Billing" },
];

export function SettingsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = searchParams.get("tab") ?? "profile";

  function setTab(value: string) {
    router.replace(`${pathname}?tab=${value}`, { scroll: false });
  }

  return (
    <Tabs value={active} onValueChange={setTab}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="profile"><ProfileSettings /></TabsContent>
      <TabsContent value="account"><AccountSettings /></TabsContent>
      <TabsContent value="notifications"><NotificationSettings /></TabsContent>
      <TabsContent value="security"><SecuritySettings /></TabsContent>
      <TabsContent value="billing"><BillingSettings /></TabsContent>
    </Tabs>
  );
}
