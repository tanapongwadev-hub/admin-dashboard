import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

// Videos uploaded from the manuals page live outside /public so they can be added
// at runtime. Override the location with MANUAL_VIDEO_DIR (e.g. a mounted volume).
const ROOT = process.env.MANUAL_VIDEO_DIR || path.join(process.cwd(), "data", "manual-videos");

export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
const EXTENSIONS = ["mp4", "webm"] as const;

// The directory is a runtime location outside the build, so tell Turbopack not to trace it.
export function videoFilePath(slug: string, ext: string): string {
  return path.join(/*turbopackIgnore: true*/ ROOT, `${slug}.${ext}`);
}

/** The uploaded file for a slug, if any (newest extension wins). */
export async function findUploadedVideo(slug: string): Promise<{ file: string; size: number; mtimeMs: number; type: string } | null> {
  for (const ext of EXTENSIONS) {
    const file = videoFilePath(slug, ext);
    try {
      const stat = await fs.stat(/*turbopackIgnore: true*/ file);
      return { file, size: stat.size, mtimeMs: stat.mtimeMs, type: ext === "webm" ? "video/webm" : "video/mp4" };
    } catch {
      /* not uploaded with this extension */
    }
  }
  return null;
}

export async function ensureVideoDir(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
}

export async function removeUploadedVideo(slug: string): Promise<void> {
  await Promise.all(EXTENSIONS.map((ext) => fs.rm(videoFilePath(slug, ext), { force: true })));
}
