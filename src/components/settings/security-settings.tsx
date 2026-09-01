"use client";

import * as React from "react";
import { toast } from "sonner";
import { Laptop, Smartphone, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const sessions = [
  { id: "s1", device: "MacBook Pro · Chrome", location: "Bangkok, Thailand", current: true, icon: Laptop },
  { id: "s2", device: "iPhone 15 · Panel app", location: "Bangkok, Thailand", current: false, icon: Smartphone },
  { id: "s3", device: "Windows PC · Edge", location: "Singapore", current: false, icon: Laptop },
];

export function SecuritySettings() {
  const [twoFactor, setTwoFactor] = React.useState(true);

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Password updated");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Use a strong password you don&apos;t use elsewhere.</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" required minLength={8} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input id="confirm" type="password" required minLength={8} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit">Update password</Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Two-factor authentication</CardTitle>
            <CardDescription>Add an extra layer of security to your account.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-medium text-fg">Authenticator app</p>
              <p className="text-sm text-fg-muted">{twoFactor ? "Enabled" : "Not enabled"}</p>
            </div>
          </div>
          <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>Devices currently signed in to your account.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-fg-muted">
                  <session.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    {session.device}
                    {session.current && <Badge variant="success" className="text-[10px]">This device</Badge>}
                  </p>
                  <p className="text-sm text-fg-muted">{session.location}</p>
                </div>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => toast.success("Session revoked")}>
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
