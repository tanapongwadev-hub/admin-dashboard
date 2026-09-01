"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Activity, Building2, Eye, EyeOff, KeyRound, Lock, Plug, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/layout/logo";
import { loginAction, selectDepartmentAction } from "./actions";
import type { DepartmentOption } from "@/lib/api/auth";

const features = [
  { icon: Activity, label: "Real-time dashboards & alerts" },
  { icon: ShieldCheck, label: "Role-based access with audit logs" },
  { icon: Plug, label: "Native integrations with your stack" },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Department-selection step: set when the API reports the user has
  // multiple active assignments and must pick one before a session is issued.
  const [departmentStep, setDepartmentStep] = React.useState<{
    token: string;
    departments: DepartmentOption[];
  } | null>(null);
  const [selectedDepartment, setSelectedDepartment] = React.useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    setLoading(true);
    const result = await loginAction(username, password);
    setLoading(false);

    if (result.status === "success") {
      toast.success("Welcome back");
      router.push("/dashboard");
      return;
    }
    if (result.status === "select-department") {
      setDepartmentStep({
        token: result.departmentSelectionToken,
        departments: result.departments,
      });
      if (result.departments.length > 0) {
        setSelectedDepartment(result.departments[0].userDepartmentRoleId);
      }
      return;
    }
    toast.error(result.message);
  }

  async function handleDepartmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentStep || !selectedDepartment) return;

    setLoading(true);
    const result = await selectDepartmentAction(
      departmentStep.token,
      selectedDepartment
    );
    setLoading(false);

    if (result.status === "success") {
      toast.success("Welcome back");
      router.push("/dashboard");
      return;
    }
    if (result.status === "error") {
      toast.error(result.message);
    }
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-bg lg:grid-cols-2">
      {/* ============================================
          LEFT — Brand panel (hidden on mobile)
          ============================================ */}
      <aside className="relative hidden overflow-hidden bg-[#0B0E14] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* Decorative layers */}
        <div className="pointer-events-none absolute inset-0">
          {/* Grid pattern (masked to fade at edges) */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, black 25%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 25%, transparent 75%)",
            }}
          />
          {/* Glow blobs */}
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/40 blur-3xl" />
          <div className="absolute -right-32 -bottom-40 h-[480px] w-[480px] rounded-full bg-info/25 blur-3xl" />
        </div>

        {/* Top — logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 12.5V6L8 2L14 6V12.5"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5.5 14V8.5H10.5V14"
                stroke="white"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Panel</span>
        </div>

        {/* Middle — headline + features */}
        <div className="relative z-10 max-w-md space-y-9">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              ALL SYSTEMS OPERATIONAL
            </span>
            <h2 className="text-[32px] font-semibold leading-[1.1] tracking-tight text-white xl:text-[40px]">
              Run your operations from one calm dashboard.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/60">
              Inventory, orders and customers in one place — without the tab juggling,
              without the late-night spreadsheet fixes.
            </p>
          </div>

          <ul className="space-y-2.5">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/[0.05]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/[0.07] text-white/85 transition-colors group-hover:bg-white/15">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-white/85">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — testimonial + copyright */}
        <div className="relative z-10 max-w-md space-y-5">
          <blockquote className="space-y-3 border-l-2 border-primary/70 pl-4">
            <p className="text-[15px] leading-relaxed text-white/80">
              &ldquo;Panel gave our ops team one place to see everything — orders,
              inventory, customers — without switching tabs.&rdquo;
            </p>
            <footer className="flex items-center gap-3 text-xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/90">
                RC
              </span>
              <div>
                <p className="font-medium text-white/90">Ravi Costa</p>
                <p className="text-white/50">COO, Northwind Retail</p>
              </div>
            </footer>
          </blockquote>
          <p className="text-[11px] tracking-wide text-white/30">
            © 2026 Panel, Inc. — All rights reserved.
          </p>
        </div>
      </aside>

      {/* ============================================
          RIGHT — Form panel
          ============================================ */}
      <main className="relative flex flex-col px-6 py-8 sm:px-12 lg:px-14 xl:px-20">
        {/* Decorative layers */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
          style={{
            color: "var(--border)",
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 60% 60% at 100% 0%, black 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 60% at 100% 0%, black 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-[320px] w-[320px] rounded-full bg-primary-soft/60 blur-3xl dark:bg-primary-soft/30"
        />

        {/* Mobile-only top bar (logo) */}
        <div className="relative z-10 mb-8 flex items-center justify-between lg:hidden">
          <Logo />
        </div>

        {/* Desktop-only top-right helper link */}
        <div className="relative z-10 hidden text-sm text-fg-muted lg:flex lg:justify-end">
          New to Panel?{" "}
          <Link
            href="/register"
            className="ml-1.5 font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </div>

        {/* Form — vertically centered */}
        <div className="relative z-10 flex flex-1 items-center justify-center py-6">
          <div className="w-full max-w-sm">
            <div className="flex flex-col gap-8">
              {departmentStep ? (
                <>
                  {/* Header — department selection */}
                  <div className="flex flex-col items-start gap-4">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"
                    >
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="space-y-1.5">
                      <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg">
                        Choose a department
                      </h1>
                      <p className="text-sm text-fg-muted">
                        Your account has access to multiple departments. Pick
                        one to continue.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleDepartmentSubmit}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={selectedDepartment}
                        onValueChange={setSelectedDepartment}
                      >
                        <SelectTrigger id="department" className="h-10">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentStep.departments.map((dept) => (
                            <SelectItem
                              key={dept.userDepartmentRoleId}
                              value={dept.userDepartmentRoleId}
                            >
                              {dept.departmentName} — {dept.roleCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="mt-2"
                      disabled={loading || !selectedDepartment}
                    >
                      {loading ? "Signing in..." : "Continue"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDepartmentStep(null)}
                      className="text-center text-sm text-fg-muted hover:text-fg"
                    >
                      Back to sign in
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex flex-col items-start gap-4">
                    <span
                      aria-hidden
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"
                    >
                      <KeyRound className="h-5 w-5" />
                    </span>
                    <div className="space-y-1.5">
                      <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg">
                        Sign in to Panel
                      </h1>
                      <p className="text-sm text-fg-muted">
                        Enter your username and password to continue.
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                        />
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder="your.username"
                          autoComplete="username"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          required
                          className="h-10 pl-9"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                        />
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          required
                          minLength={6}
                          className="h-10 pl-9 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="mt-2"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer — terms */}
        <div className="relative z-10 mt-6 text-center text-[11px] text-fg-muted">
          By signing in, you agree to our{" "}
          <Link href="#" className="text-fg-secondary hover:text-fg">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="#" className="text-fg-secondary hover:text-fg">
            Privacy Policy
          </Link>
          .
        </div>
      </main>
    </div>
  );
}
