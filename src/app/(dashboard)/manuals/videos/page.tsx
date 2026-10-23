import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { VIDEO_CHAPTERS } from "@/lib/manuals/videos";
import { findUploadedVideo } from "@/lib/manuals/video-store";
import { getCurrentSession } from "@/lib/session";
import { VideoCardUploader } from "@/components/manuals/video-card-uploader";

export const metadata: Metadata = { title: "คู่มือวิดีโอ" };

// Each video plays inside its own card. preload="none" + a poster keeps the page
// light: no video bytes are fetched until the user presses play.
export default async function VideoManualsPage() {
  const session = await getCurrentSession();
  const canUpload = !!session?.user.isSuperAdmin;
  // An uploaded file overrides the bundled one; ?v= busts the browser cache on replace.
  const uploads = new Map(
    await Promise.all(
      VIDEO_CHAPTERS.flatMap((chapter) => chapter.videos).map(async (video) => [video.slug, await findUploadedVideo(video.slug)] as const),
    ),
  );
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">คู่มือการใช้งานแบบวิดีโอ</h1>
        <p className="text-sm text-fg-secondary">แต่ละการ์ดมีวิดีโออยู่ด้านบน และรายละเอียดขั้นตอนอยู่ด้านล่าง</p>
      </div>
      <nav aria-label="หมวดคู่มือวิดีโอ" className="flex flex-wrap gap-2">
        {VIDEO_CHAPTERS.map((chapter) => (
          <a key={chapter.number} href={`#chapter-${chapter.number}`} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-secondary hover:border-primary hover:text-primary">
            {chapter.number}. {chapter.title}
          </a>
        ))}
      </nav>
      {VIDEO_CHAPTERS.map((chapter) => (
        <section key={chapter.number} aria-labelledby={`chapter-${chapter.number}`} className="scroll-mt-4">
          <h2 id={`chapter-${chapter.number}`} className="text-lg font-semibold text-fg">
            <span className="mr-1.5 tabular-nums text-fg-muted">{chapter.number}.</span>
            {chapter.title}
          </h2>
          <p className="mb-3 text-sm text-fg-secondary">{chapter.description}</p>
          <ul className="grid gap-4 lg:grid-cols-2">
            {chapter.videos.map((video, index) => {
              const showGroup = video.group && video.group !== chapter.videos[index - 1]?.group;
              const uploaded = uploads.get(video.slug);
              const src = uploaded ? `/api/manual-videos/${video.slug}?v=${Math.round(uploaded.mtimeMs)}` : video.src;
              return (
              <Fragment key={video.slug}>
              {showGroup && (
                <li className="mt-2 text-sm font-semibold text-fg-secondary lg:col-span-2" role="presentation">{video.group}</li>
              )}
              <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
                {src ? (
                  <video
                    controls
                    preload={uploaded ? "metadata" : "none"}
                    poster={uploaded ? undefined : video.poster}
                    className="aspect-video w-full bg-navy object-cover"
                    aria-label={`${video.number} ${video.title}`}
                  >
                    {/* Uploaded files have no poster image: #t=0.1 makes the browser show a real frame as the cover. */}
                    <source src={uploaded ? `${src}#t=0.1` : src} type={uploaded?.type ?? "video/mp4"} />
                    เบราว์เซอร์นี้ไม่รองรับการเล่นวิดีโอ
                  </video>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy to-navy-dark text-white/80">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                      <Clapperboard className="size-7" aria-hidden />
                    </span>
                    <span className="text-sm">{video.number} · วิดีโอกำลังจัดทำ</span>
                  </div>
                )}
                <div className="flex flex-col gap-1 p-4">
                  <p className="text-sm font-medium tabular-nums text-primary">{video.number}</p>
                  <h3 className="font-medium text-fg">{video.title}</h3>
                  <p className="text-sm text-fg-secondary">{video.summary}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg-secondary">
                    {video.steps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                  {video.screenHref && (
                    <Link href={video.screenHref} className="mt-2 w-fit text-sm text-primary hover:underline">
                      เปิดหน้าจอนี้
                    </Link>
                  )}
                  {video.manualHref && (
                    <Link href={video.manualHref} className="w-fit text-sm text-primary hover:underline">
                      ดูคู่มือแบบตัวอักษรพร้อมภาพหน้าจอ
                    </Link>
                  )}
                  {canUpload && <div className="mt-2"><VideoCardUploader slug={video.slug} hasUpload={!!uploaded} /></div>}
                </div>
              </li>
              </Fragment>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
