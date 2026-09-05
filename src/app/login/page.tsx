"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  Eye,
  EyeOff,
  Lock,
  Plug,
  ShieldCheck,
  User,
} from "lucide-react";
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
import { loginAction, selectDepartmentAction } from "./actions";
import type { DepartmentOption } from "@/lib/api/auth";

const features = [
  { icon: Activity, label: "ออเดอร์ผลิตและสต็อกในหน้าจอเดียว" },
  { icon: ShieldCheck, label: "สิทธิ์การเข้าถึงตามบทบาท พร้อมบันทึกการตรวจสอบ" },
  { icon: Plug, label: "เชื่อมต่อระบบ ERP ได้โดยตรงทั่วทั้งสายการผลิต" },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Department-selection step: set when the API reports the user has
  // multiple active assignments and must pick one before a session is issued.
  // The selection token itself stays server-side in a cookie (see actions.ts)
  // — the client only ever sees the department list to render.
  const [departmentStep, setDepartmentStep] = React.useState<{
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
      toast.success("ยินดีต้อนรับกลับ");
      router.push("/dashboard");
      return;
    }
    if (result.status === "select-department") {
      setDepartmentStep({ departments: result.departments });
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
    const result = await selectDepartmentAction(selectedDepartment);
    setLoading(false);

    if (result.status === "success") {
      toast.success("ยินดีต้อนรับกลับ");
      router.push("/dashboard");
      return;
    }
    if (result.status === "error") {
      toast.error(result.message);
    }
  }

  return (
    <div className="relative min-h-dvh bg-bg lg:grid lg:grid-cols-2">
      {/* ============================================
          LEFT — Brand pane (desktop only)
          Factory photo + brand identity
          ============================================ */}
      <aside className="relative hidden overflow-hidden bg-[#0A1628] text-white lg:flex lg:flex-col lg:justify-between">
        {/* Background photo + dark wash */}
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/cps-factory-background.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 0"
            className="object-cover object-center opacity-55"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628]/95 via-[#0A1628]/75 to-[#1E3A5F]/70" />
          {/* Amber + teal corner glows */}
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#F59E0B]/15 blur-3xl" />
          <div className="absolute -right-32 -bottom-40 h-[480px] w-[480px] rounded-full bg-[#0EA5A4]/20 blur-3xl" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse at center, black 25%, transparent 75%)",
              WebkitMaskImage:
                "radial-gradient(ellipse at center, black 25%, transparent 75%)",
            }}
          />
        </div>

        {/* Top — status + wordmark */}
        <div className="relative z-10 flex items-start justify-between p-10 xl:p-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-wide text-white/70 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59E0B]/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
            </span>
            ระบบทำงานปกติทั้งหมด
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            v1.0
          </span>
        </div>

        {/* Middle — logo + headline + features */}
        <div className="relative z-10 max-w-md space-y-9 px-10 xl:px-14">
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 shadow-2xl shadow-black/40 ring-1 ring-black/5">
              <Image
                src="/cci_logo.png"
                alt="Chiewchan Industry"
                width={80}
                height={80}
                className="h-16 w-16 object-contain"
                priority
              />
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F59E0B]">
                Chiewchan Industry
              </p>
              <h2 className="text-[28px] font-semibold leading-none tracking-tight text-white xl:text-[32px]">
                CPS
              </h2>
              <p className="mt-0.5 text-xs text-white/60">
                Chiewchan Production System
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[15px] leading-relaxed text-white/75">
              บริหารสายการผลิตจากคอนโซลเดียวอย่างเป็นระบบ — ออเดอร์ สต็อก
              และแผนกต่าง ๆ อยู่ในที่เดียว ไม่ต้องสลับหน้าจอไปมา
              หรือมานั่งแก้สเปรดชีตดึกดื่น
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

        {/* Bottom — asset-tag strip + copyright */}
        <div className="relative z-10 space-y-4 px-10 pb-10 xl:px-14 xl:pb-14">
          <div className="relative flex h-7 items-stretch">
            <div className="w-1/3 bg-[#F59E0B]" />
            <div className="flex-1 bg-[#0A1628]" />
            <div className="w-1/5 bg-[#1E3A5F]" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
                CPS · CHIEWCHAN INDUSTRY
              </span>
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
            © 2026 Chiewchan Industry Co., Ltd.
          </p>
        </div>
      </aside>

      {/* ============================================
          RIGHT — Form pane
          White surface + centered card
          ============================================ */}
      <main className="relative flex min-h-dvh flex-col bg-bg lg:min-h-0">
        {/* Mobile-only top brand band */}
        <div className="relative overflow-hidden bg-[#0A1628] px-4 py-4 lg:hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage:
                "linear-gradient(to right, black 0%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, black 0%, transparent 100%)",
            }}
          />
          <div className="relative flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white/95 shadow-md ring-1 ring-black/5">
              <Image
                src="/cci_logo.png"
                alt="Chiewchan Industry"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F59E0B]">
                Chiewchan Industry
              </p>
              <p className="text-sm font-semibold leading-tight text-white">
                CPS — Chiewchan Production System
              </p>
            </div>
          </div>
        </div>

        {/* Centered card area */}
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-10 xl:px-16">
          <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-surface shadow-2xl shadow-black/10 ring-1 ring-border">
            {/* Asset-tag strip — the signature element */}
            <div className="relative flex h-7 items-stretch">
              <div className="w-1/3 bg-[#F59E0B]" />
              <div className="flex-1 bg-[#0A1628]" />
              <div className="w-1/5 bg-[#1E3A5F]" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-end pr-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
                  CPS · CHIEWCHAN INDUSTRY
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-border sm:h-[72px] sm:w-[72px]">
                  <Image
                    src="/cci_logo.png"
                    alt="Chiewchan Industry"
                    width={72}
                    height={72}
                    className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                    priority
                  />
                </div>
                <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-fg sm:text-[24px]">
                  {departmentStep ? "เลือกแผนก" : "เข้าสู่ระบบ"}
                </h1>
                <p className="mt-1.5 text-sm text-fg-muted">
                  {departmentStep
                    ? "บัญชีของคุณมีสิทธิ์เข้าถึงหลายแผนก กรุณาเลือกแผนกเพื่อดำเนินการต่อ"
                    : "เข้าสู่คอนโซลปฏิบัติการของ CPS"}
                </p>
              </div>

              <div className="mt-7">
                {departmentStep ? (
                  <form
                    onSubmit={handleDepartmentSubmit}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="department">แผนก</Label>
                      <Select
                        value={selectedDepartment}
                        onValueChange={setSelectedDepartment}
                      >
                        <SelectTrigger id="department" className="h-10">
                          <SelectValue placeholder="เลือกแผนก" />
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
                      {loading ? "กำลังเข้าสู่ระบบ..." : "ดำเนินการต่อ"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDepartmentStep(null)}
                      className="text-center text-sm text-fg-muted transition-colors hover:text-fg"
                    >
                      กลับไปหน้าเข้าสู่ระบบ
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                    noValidate
                  >
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="username">ชื่อผู้ใช้</Label>
                      <div className="relative">
                        <User
                          aria-hidden
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                        />
                        <Input
                          id="username"
                          name="username"
                          type="text"
                          placeholder="ชื่อผู้ใช้ของคุณ"
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
                        <Label htmlFor="password">รหัสผ่าน</Label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          ลืมรหัสผ่าน?
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
                            showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
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
                      {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    </Button>
                  </form>
                )}
              </div>
            </div>

            {/* Card footer — compliance line */}
            <div className="border-t border-border bg-surface-2 px-6 py-3 sm:px-8">
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-fg-muted">
                <ShieldCheck className="h-3 w-3" />
                <span>
                  เซสชันปลอดภัย ได้รับการปกป้องโดยระบบควบคุมการเข้าถึงของ CPS
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Below-card meta (mobile only) */}
        <p className="pb-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-fg-muted lg:hidden">
          © 2026 Chiewchan Industry Co., Ltd. — v1.0
        </p>
      </main>
    </div>
  );
}
