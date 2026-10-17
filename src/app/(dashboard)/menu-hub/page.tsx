import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Search, SearchX, X } from "lucide-react";
import { getCurrentSession } from "@/lib/session";
import { menuHref } from "@/lib/nav";
import { resolveMenuIcons, type ResolvedMenuNode } from "@/lib/menu-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "รวมเมนู" };

interface HubLink {
  id: string;
  label: string;
  context: string | null;
  href: string;
  Icon: LucideIcon;
}

// One accent per category, cycled. Soft tile + solid dot, all existing tokens.
const ACCENTS = [
  { tile: "bg-primary-soft text-primary", dot: "bg-primary", hover: "hover:border-primary/50" },
  { tile: "bg-success-soft text-success-fg", dot: "bg-success", hover: "hover:border-success/50" },
  { tile: "bg-warning-soft text-warning-fg", dot: "bg-warning", hover: "hover:border-warning/50" },
  { tile: "bg-info-soft text-info-fg", dot: "bg-info", hover: "hover:border-info/50" },
] as const;

// Flatten a root menu's reachable pages. Pathless containers only contribute
// their name as context ("สั่งผลิตตามกระบวนการ"); BUTTON nodes are never pages.
function collectLinks(nodes: ResolvedMenuNode[], context: string | null = null): HubLink[] {
  return nodes.flatMap((node) => {
    if (node.menuType === "BUTTON") return [];
    const own: HubLink[] = node.path
      ? [{ id: node.id, label: node.name, context, href: menuHref(node.path), Icon: node.Icon }]
      : [];
    return [...own, ...collectLinks(node.children, node.path ? context : node.name)];
  });
}

function HubIcon({ Icon, className }: { Icon: LucideIcon; className?: string }) {
  return <Icon className={className} aria-hidden="true" />;
}

// Built from session.menus, which cps-api already filtered to what this user
// may open — the page needs no permission of its own.
export default async function MenuHubPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const session = await getCurrentSession();
  const roots = resolveMenuIcons(session?.menus ?? []).filter((root) => root.path !== "/menu-hub");

  const sections = roots
    .map((root, index) => {
      const all = collectLinks(root.children.length ? root.children : [root]);
      const rootMatches = root.name.toLowerCase().includes(q);
      const links = q && !rootMatches
        ? all.filter((link) => `${link.context ?? ""} ${link.label}`.toLowerCase().includes(q))
        : all;
      return { root, links, accent: ACCENTS[index % ACCENTS.length] };
    })
    .filter((section) => section.links.length > 0);

  const total = sections.reduce((sum, section) => sum + section.links.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">รวมเมนู</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            {q ? `พบ ${total} หน้า จากคำค้น “${q}”` : `ทุกหน้าที่คุณเข้าถึงได้ ${total} หน้า ใน ${sections.length} หมวด`}
          </p>
        </div>
        <form method="get" role="search" className="flex w-full gap-2 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <label htmlFor="hub-q" className="sr-only">ค้นหาเมนู</label>
            <Input id="hub-q" name="q" defaultValue={q} placeholder="ค้นหาเมนู…" className="h-11 rounded-full bg-surface pl-10" autoComplete="off" />
          </div>
          {q && (
            <Button asChild variant="ghost" className="h-11 rounded-full">
              <Link href="/menu-hub"><X className="size-4" aria-hidden />ล้าง</Link>
            </Button>
          )}
        </form>
      </header>

      {sections.length > 1 && (
        <nav aria-label="ข้ามไปยังหมวด" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map(({ root, accent }) => (
            <a key={root.id} href={`#hub-${root.id}`} className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-surface-2 hover:text-fg">
              <span className={`size-2 rounded-full ${accent.dot}`} aria-hidden />
              {root.name}
            </a>
          ))}
        </nav>
      )}

      {sections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong py-16 text-center">
          <SearchX className="size-8 text-fg-muted" aria-hidden />
          <p className="text-sm font-medium text-fg">ไม่พบเมนูที่ตรงกับคำค้น</p>
          <Button asChild variant="outline" size="sm"><Link href="/menu-hub">ดูเมนูทั้งหมด</Link></Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map(({ root, links, accent }) => (
            <section key={root.id} id={`hub-${root.id}`} aria-labelledby={`hub-title-${root.id}`} className="scroll-mt-24">
              <div className="mb-3 flex items-center gap-3">
                <span className={`flex size-9 items-center justify-center rounded-xl ${accent.tile}`}>
                  <HubIcon Icon={root.Icon} className="size-[18px]" />
                </span>
                <h2 id={`hub-title-${root.id}`} className="text-base font-semibold text-fg">{root.name}</h2>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">{links.length}</span>
                <span className="h-px flex-1 bg-border" aria-hidden />
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {links.map((link) => (
                  <li key={link.id}>
                    <Link href={link.href} className={`group flex h-full items-center gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${accent.hover}`}>
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent.tile}`}>
                        <HubIcon Icon={link.Icon} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{link.label}</span>
                        {link.context && <span className="block truncate text-xs text-fg-muted">{link.context}</span>}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-fg-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
