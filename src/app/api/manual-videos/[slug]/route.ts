import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getCurrentSession } from "@/lib/session";
import { VIDEO_SLUGS } from "@/lib/manuals/videos";
import {
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
  ensureVideoDir,
  findUploadedVideo,
  removeUploadedVideo,
  videoFilePath,
} from "@/lib/manuals/video-store";

type Ctx = { params: Promise<{ slug: string }> };

async function requireAdmin(): Promise<Response | null> {
  const session = await getCurrentSession();
  if (!session) return Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!session.user.isSuperAdmin) return Response.json({ message: "เฉพาะผู้ดูแลระบบสูงสุดเท่านั้น" }, { status: 403 });
  return null;
}

function knownSlug(slug: string): boolean {
  return VIDEO_SLUGS.includes(slug);
}

// Streams the uploaded video with Range support so the player can seek.
// Browsers cancel in-flight ranges while seeking. Readable.toWeb keeps pushing into the
// closed controller and crashes the process (ERR_INVALID_STATE), so destroy the file
// stream when the response is cancelled and ignore late chunks.
function fileStream(file: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const source = createReadStream(file, range);
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      source.on("data", (chunk) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk as Buffer));
        } catch {
          closed = true;
          source.destroy();
          return;
        }
        if ((controller.desiredSize ?? 1) <= 0) source.pause();
      });
      source.on("end", () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      });
      source.on("error", (error) => {
        if (closed) return;
        closed = true;
        try { controller.error(error); } catch { /* already closed */ }
      });
    },
    pull() {
      source.resume();
    },
    cancel() {
      closed = true;
      source.destroy();
    },
  });
}

export async function GET(request: Request, { params }: Ctx) {
  const { slug } = await params;
  if (!knownSlug(slug) || !(await getCurrentSession())) return new Response(null, { status: 404 });
  const video = await findUploadedVideo(slug);
  if (!video) return new Response(null, { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": video.type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, must-revalidate",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : video.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : video.size - 1;
    start = Math.max(0, start);
    end = Math.min(video.size - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${video.size}` } });
    const body = fileStream(video.file, { start, end });
    return new Response(body, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${video.size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const body = fileStream(video.file);
  return new Response(body, { headers: { ...headers, "Content-Length": String(video.size) } });
}

// The request body is the raw video file (not multipart) so it can be streamed to disk.
export async function PUT(request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { slug } = await params;
  if (!knownSlug(slug)) return Response.json({ message: "ไม่พบหัวข้อวิดีโอ" }, { status: 404 });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = VIDEO_TYPES[type];
  if (!ext) return Response.json({ message: "รองรับเฉพาะไฟล์ MP4 หรือ WebM" }, { status: 415 });
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_VIDEO_BYTES) return Response.json({ message: "ไฟล์ใหญ่เกิน 300 MB" }, { status: 413 });
  if (!request.body) return Response.json({ message: "ไม่พบไฟล์วิดีโอ" }, { status: 400 });

  await ensureVideoDir();
  const target = videoFilePath(slug, ext);
  const temp = `${target}.uploading`;
  let received = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, callback) {
      received += chunk.length;
      if (received > MAX_VIDEO_BYTES) callback(new Error("TOO_LARGE"));
      else callback(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), limiter, createWriteStream(temp));
    if (received === 0) throw new Error("EMPTY");
    await removeUploadedVideo(slug);
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true });
    const message = (error as Error).message;
    if (message === "TOO_LARGE") return Response.json({ message: "ไฟล์ใหญ่เกิน 300 MB" }, { status: 413 });
    if (message === "EMPTY") return Response.json({ message: "ไฟล์ว่างเปล่า" }, { status: 400 });
    return Response.json({ message: "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
  return Response.json({ ok: true, size: received });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { slug } = await params;
  if (!knownSlug(slug)) return Response.json({ message: "ไม่พบหัวข้อวิดีโอ" }, { status: 404 });
  await removeUploadedVideo(slug);
  return Response.json({ ok: true });
}
