import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* Same fixed dark-navy brand surface as the sidebar and the login
          page's brand pane — bg-navy, not a raw hex, so this stays in sync
          if the brand navy ever changes (see globals.css). */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(23,105,209,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(245,158,11,0.2), transparent 45%)",
          }}
        />
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 12.5V6L8 2L14 6V12.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 14V8.5H10.5V14" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">CPS</span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-2xl font-medium leading-snug text-white/95">
            ระบบควบคุมวัตถุดิบและการผลิตของ Chiewchan Industry
          </p>
          <p className="mt-3 text-sm text-white/70">
            รับเข้า จ่ายออก วางแผนการผลิต และติดตามกระบวนการผลิตในที่เดียว
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/60">© Chiewchan Industry Co., Ltd.</p>
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
