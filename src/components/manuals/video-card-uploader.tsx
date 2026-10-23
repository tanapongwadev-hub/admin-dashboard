"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 300 * 1024 * 1024;

// Lets a SUPER_ADMIN choose a video file from their computer for one card.
// The raw file is PUT to /api/manual-videos/<slug> (streamed to disk server side).
export function VideoCardUploader({ slug, hasUpload }: { slug: string; hasUpload: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);

  function upload(file: File) {
    if (file.type !== "video/mp4" && file.type !== "video/webm") {
      toast.error("เลือกได้เฉพาะไฟล์ MP4 หรือ WebM");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("ไฟล์ใหญ่เกิน 300 MB ควรบีบอัดวิดีโอก่อน");
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/manual-videos/${slug}`);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success("อัปโหลดวิดีโอแล้ว");
        router.refresh();
      } else {
        let message = "อัปโหลดไม่สำเร็จ กรุณาลองใหม่";
        try { message = (JSON.parse(xhr.responseText) as { message?: string }).message ?? message; } catch { /* keep default */ }
        toast.error(message);
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      toast.error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
    };
    setProgress(0);
    xhr.send(file);
  }

  async function remove() {
    setRemoving(true);
    try {
      const response = await fetch(`/api/manual-videos/${slug}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("ลบวิดีโอที่อัปโหลดแล้ว");
      router.refresh();
    } catch {
      toast.error("ลบวิดีโอไม่สำเร็จ");
    } finally {
      setRemoving(false);
    }
  }

  const uploading = progress !== null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="sr-only"
        aria-label="เลือกไฟล์วิดีโอ"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading || removing} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {uploading ? `กำลังอัปโหลด ${progress}%` : hasUpload ? "เปลี่ยนไฟล์วิดีโอ" : "เลือกไฟล์วิดีโอ"}
      </Button>
      {hasUpload && !uploading && (
        <Button type="button" variant="ghost" size="sm" disabled={removing} onClick={remove}>
          <Trash2 className="size-4" aria-hidden /> ลบไฟล์ที่อัปโหลด
        </Button>
      )}
      <span className="text-xs text-fg-muted">MP4 / WebM ไม่เกิน 300 MB</span>
    </div>
  );
}
