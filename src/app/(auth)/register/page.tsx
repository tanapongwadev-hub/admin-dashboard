"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const checks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /[0-9]/.test(password) },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Account created");
      router.push("/dashboard");
    }, 700);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Create your account</h1>
        <p className="mt-1.5 text-sm text-fg-muted">Start your 14-day free trial. No credit card required.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" placeholder="Jordan" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" placeholder="Blake" required />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" placeholder="you@company.com" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1 flex flex-col gap-1">
            {checks.map((c) => (
              <div key={c.label} className={cn("flex items-center gap-1.5 text-xs", c.valid ? "text-success" : "text-fg-muted")}>
                <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full", c.valid ? "bg-success text-white" : "bg-surface-2")}>
                  {c.valid && <Check className="h-2.5 w-2.5" />}
                </span>
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="mt-1" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-xs text-fg-muted">
          By continuing, you agree to Panel&apos;s{" "}
          <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and{" "}
          <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="text-center text-sm text-fg-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
