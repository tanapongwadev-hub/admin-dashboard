import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, KeyRound, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findCategory, findManual, MANUALS, manualsByCategory } from "@/lib/manuals/content";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MANUALS.map((manual) => ({ slug: manual.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const manual = findManual((await params).slug);
  return { title: manual ? `คู่มือ: ${manual.title}` : "คู่มือการใช้งาน" };
}

export default async function ManualDetailPage({ params }: Params) {
  const manual = findManual((await params).slug);
  if (!manual) notFound();
  const category = findCategory(manual.category);
  const siblings = manualsByCategory(manual.category);
  const position = siblings.findIndex((item) => item.slug === manual.slug);
  const previous = siblings[position - 1];
  const next = siblings[position + 1];
  const related = (manual.related ?? []).map(findManual).filter((item) => item !== undefined);

  return (
    <article className="flex w-full flex-col gap-6">
      <Link href={`/manuals#${category.id}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-fg-secondary hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        คู่มือการใช้งาน · {category.title}
      </Link>

      <header className="flex flex-col gap-3">
        <Badge variant="primary" className="w-fit"><category.icon className="size-3.5" aria-hidden />{category.title}</Badge>
        <h1 className="text-2xl font-semibold text-fg">{manual.title}</h1>
        <p className="text-fg-secondary">{manual.summary}</p>
        <div className="flex flex-wrap items-center gap-3">
          {manual.href && (
            <Button asChild>
              <Link href={manual.href}>เปิดหน้าจอนี้<ExternalLink className="size-4" aria-hidden /></Link>
            </Button>
          )}
          {manual.access && (
            <p className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
              <KeyRound className="size-4 text-fg-muted" aria-hidden />
              {manual.access}
            </p>
          )}
        </div>
      </header>

      <ol className="flex flex-col gap-6" aria-label="ขั้นตอน">
        {manual.steps.map((step, index) => (
          <li key={step.title} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg" aria-hidden>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-fg"><span className="sr-only">ขั้นที่ {index + 1}: </span>{step.title}</h2>
                <p className="mt-1 leading-relaxed text-fg-secondary">{step.detail}</p>
              </div>
            </div>
            {step.image && (
              <figure className="mt-4">
                <a href={step.image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border-strong bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Image src={step.image} alt={step.imageAlt ?? step.title} width={1440} height={900} sizes="(min-width: 1024px) calc(100vw - 340px), 100vw" className="h-auto w-full" />
                </a>
                <figcaption className="mt-1.5 text-xs text-fg-muted">{step.imageAlt ?? step.title} · คลิกเพื่อดูภาพเต็ม</figcaption>
              </figure>
            )}
            {step.callouts && step.callouts.length > 0 && (
              <ol className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="คำอธิบายหมายเลขในภาพ">
                {step.callouts.map((text, n) => (
                  <li key={text} className="flex gap-2.5 rounded-lg bg-surface-2 p-2.5 text-sm text-fg-secondary">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-danger text-xs font-bold text-primary-fg" aria-hidden>
                      {n + 1}
                    </span>
                    <span className="min-w-0 leading-relaxed"><span className="sr-only">หมายเลข {n + 1}: </span>{text}</span>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>

      {manual.tips && manual.tips.length > 0 && (
        <aside className="rounded-xl border border-warning/40 bg-warning-soft p-5" aria-label="ข้อควรรู้">
          <h2 className="flex items-center gap-2 font-semibold text-fg"><Lightbulb className="size-4 text-warning" aria-hidden />ข้อควรรู้</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-secondary">
            {manual.tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </aside>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related-title">
          <h2 id="related-title" className="mb-2 font-semibold text-fg">คู่มือที่เกี่ยวข้อง</h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/manuals/${item.slug}`} className="inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-secondary hover:border-primary hover:text-primary">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="คู่มือก่อนหน้าและถัดไป" className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        {previous ? (
          <Link href={`/manuals/${previous.slug}`} className="rounded-lg border border-border bg-surface p-4 hover:border-primary">
            <span className="flex items-center gap-1 text-xs text-fg-muted"><ArrowLeft className="size-3.5" aria-hidden />ก่อนหน้า</span>
            <span className="mt-1 block font-medium text-fg">{previous.title}</span>
          </Link>
        ) : <span />}
        {next && (
          <Link href={`/manuals/${next.slug}`} className="rounded-lg border border-border bg-surface p-4 text-right hover:border-primary sm:col-start-2">
            <span className="flex items-center justify-end gap-1 text-xs text-fg-muted">ถัดไป<ArrowRight className="size-3.5" aria-hidden /></span>
            <span className="mt-1 block font-medium text-fg">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
