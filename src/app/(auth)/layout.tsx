import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0B0E14] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(108,102,255,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(45,212,206,0.25), transparent 45%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 12.5V6L8 2L14 6V12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 14V8.5H10.5V14" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Panel</span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-2xl font-medium leading-snug text-white/95">
            &ldquo;Panel gave our ops team one place to see everything — orders, inventory and customers, without
            switching tabs.&rdquo;
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">RC</span>
            <div>
              <p className="text-sm font-medium">Ravi Costa</p>
              <p className="text-xs text-white/60">COO, Northwind Retail</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">© 2026 Panel, Inc. All rights reserved.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
