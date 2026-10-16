import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ListOrdered, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MANUAL_CATEGORIES, MANUALS, searchManuals } from "@/lib/manuals/content";
import type { Manual } from "@/lib/manuals/types";

export const metadata: Metadata = { title: "คู่มือการใช้งาน" };

// Static content, open to every signed-in user (menu permission USER_MANUAL_VIEW
// has no department restriction). Search is a plain GET form, so no client JS.
export default async function ManualsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const matches = new Set(searchManuals(q).map((manual) => manual.slug));
  const sections = MANUAL_CATEGORIES.map((category) => ({
    category,
    manuals: MANUALS.filter((manual) => manual.category === category.id && matches.has(manual.slug)),
  })).filter((section) => section.manuals.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">คู่มือการใช้งาน</h1>
        <p className="text-sm text-fg-secondary">
          วิธีใช้งานแต่ละหน้าทีละขั้นตอน พร้อมภาพหน้าจอจริง จัดหมวดตามเมนูของระบบ
        </p>
      </div>

      <form method="get" role="search" className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          <label htmlFor="manual-q" className="sr-only">ค้นหาคู่มือ</label>
          <Input id="manual-q" name="q" defaultValue={q} placeholder="ค้นหา เช่น รับเข้า, QR, แผนผลิต" className="h-10 pl-9" autoComplete="off" />
        </div>
        <Button type="submit" className="h-10">ค้นหา</Button>
        {q && (
          <Button asChild variant="ghost" className="h-10">
            <Link href="/manuals"><X className="size-4" aria-hidden />ล้าง</Link>
          </Button>
        )}
      </form>

      {!q && (
        <nav aria-label="หมวดหมู่คู่มือ" className="flex flex-wrap gap-2">
          {MANUAL_CATEGORIES.map((category) => (
            <a key={category.id} href={`#${category.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-secondary hover:border-primary hover:text-primary">
              <category.icon className="size-4" aria-hidden />
              {category.title}
            </a>
          ))}
        </nav>
      )}

      {q && <p className="text-sm text-fg-secondary">พบ {matches.size} คู่มือสำหรับ “{q}”</p>}

      {sections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium text-fg">ไม่พบคู่มือที่ตรงกับคำค้นหา</p>
          <p className="mt-1 text-sm text-fg-muted">ลองใช้คำอื่น หรือดูคู่มือทั้งหมด</p>
        </div>
      ) : (
        sections.map(({ category, manuals }, index) => (
          <section key={category.id} id={category.id} aria-labelledby={`${category.id}-title`} className="scroll-mt-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <category.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 id={`${category.id}-title`} className="text-lg font-semibold text-fg">
                  <span className="mr-1.5 tabular-nums text-fg-muted">{MANUAL_CATEGORIES.indexOf(category) + 1}.</span>
                  {category.title}
                </h2>
                <p className="text-sm text-fg-secondary">{category.description}</p>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {manuals.map((manual) => <ManualCard key={manual.slug} manual={manual} />)}
            </ul>
            {index < sections.length - 1 && <hr className="mt-6 border-border" />}
          </section>
        ))
      )}
    </div>
  );
}

function ManualCard({ manual }: { manual: Manual }) {
  return (
    <li>
      <Link
        href={`/manuals/${manual.slug}`}
        className="group flex h-full flex-col rounded-lg border border-border bg-surface p-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-semibold text-fg group-hover:text-primary">{manual.title}</span>
        <span className="mt-1 flex-1 text-sm text-fg-secondary">{manual.summary}</span>
        <span className="mt-3 flex items-center justify-between text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1"><ListOrdered className="size-3.5" aria-hidden />{manual.steps.length} ขั้นตอน</span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
        </span>
      </Link>
    </li>
  );
}
