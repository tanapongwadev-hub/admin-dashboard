import Link from "next/link";

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 12.5V6L8 2L14 6V12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 14V8.5H10.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-fg">แผงควบคุม</span>}
    </Link>
  );
}
