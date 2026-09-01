"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const emailOptions = [
  { id: "orders", label: "New orders", description: "Get notified when a new order comes in." },
  { id: "stock", label: "Low stock alerts", description: "Get notified when a product is running low." },
  { id: "team", label: "Team activity", description: "Updates when teammates join, edit or comment." },
  { id: "reports", label: "Weekly reports", description: "A summary of performance every Monday." },
];

const pushOptions = [
  { id: "mentions", label: "Mentions", description: "When someone mentions you in a comment." },
  { id: "payments", label: "Payment failures", description: "Immediate alerts for failed payments." },
];

export function NotificationSettings() {
  const [email, setEmail] = React.useState<Record<string, boolean>>({ orders: true, stock: true, team: false, reports: true });
  const [push, setPush] = React.useState<Record<string, boolean>>({ mentions: true, payments: true });
  const [marketing, setMarketing] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Email notifications</CardTitle>
            <CardDescription>Choose what you want to be emailed about.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {emailOptions.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-fg">{opt.label}</p>
                <p className="text-sm text-fg-muted">{opt.description}</p>
              </div>
              <Switch checked={email[opt.id]} onCheckedChange={(v) => setEmail((prev) => ({ ...prev, [opt.id]: v }))} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Push notifications</CardTitle>
            <CardDescription>Real-time alerts sent to your browser or device.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {pushOptions.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-fg">{opt.label}</p>
                <p className="text-sm text-fg-muted">{opt.description}</p>
              </div>
              <Switch checked={push[opt.id]} onCheckedChange={(v) => setPush((prev) => ({ ...prev, [opt.id]: v }))} />
            </div>
          ))}
          <Separator className="hidden" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Marketing emails</CardTitle>
            <CardDescription>Product updates, tips and occasional offers.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-fg-secondary">Receive marketing emails from Panel</p>
          <Switch checked={marketing} onCheckedChange={setMarketing} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={() => toast.success("Notification preferences saved")}>Save preferences</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
