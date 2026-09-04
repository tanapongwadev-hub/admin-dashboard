import test from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as materialForm from "./material-pc-form-dialog";
import * as materialsApi from "@/lib/api/materials";

type ImageCandidate = { type: string; size: number };
type ValidateMaterialImage = (
  file: ImageCandidate | null,
  required?: boolean
) => string | null;
type UploadMaterialImage = (
  accessToken: string,
  file: Blob,
  filename?: string
) => Promise<{ imagePath: string; previewUrl: string }>;
type MaterialImageUpdateFields = (
  stagedImagePath?: string
) => { imagePath?: string };
type MaterialImagePicker = React.ComponentType<{
  file: { name: string; size: number } | null;
  previewUrl: string | null;
  error: string | null;
  required?: boolean;
  hasExistingImage?: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}>;

function imageValidator(): ValidateMaterialImage {
  const candidate = (materialForm as unknown as Record<string, unknown>)
    .validateMaterialImage;
  assert.equal(
    typeof candidate,
    "function",
    "the create form must expose its Material image validation"
  );
  return candidate as ValidateMaterialImage;
}

function imagePicker(): MaterialImagePicker {
  const candidate = (materialForm as unknown as Record<string, unknown>)
    .MaterialImagePicker;
  assert.equal(
    typeof candidate,
    "function",
    "the create form must expose its redesigned image picker"
  );
  return candidate as MaterialImagePicker;
}

function imageUpdateFields(): MaterialImageUpdateFields {
  const candidate = (materialForm as unknown as Record<string, unknown>)
    .materialImageUpdateFields;
  assert.equal(
    typeof candidate,
    "function",
    "the edit flow must expose how it applies a staged replacement image"
  );
  return candidate as MaterialImageUpdateFields;
}

test("renders the empty image picker as one accessible selection surface", () => {
  const Picker = imagePicker();
  const html = renderToStaticMarkup(
    React.createElement(Picker, {
      file: null,
      previewUrl: null,
      error: null,
      inputRef: React.createRef<HTMLInputElement>(),
      onChange: () => undefined,
    })
  );

  const input = html.match(/<input[^>]+id="material-image"[^>]*>/)?.[0] ?? "";
  assert.match(input, /type="file"/);
  assert.match(input, /required/);
  assert.match(html, /<label[^>]+for="material-image"/);
  assert.match(html, /เลือกรูปภาพ/);
  assert.match(html, /JPEG, PNG หรือ WebP/);
});

test("shows the selected image preview and file summary inside the picker", () => {
  const Picker = imagePicker();
  const html = renderToStaticMarkup(
    React.createElement(Picker, {
      file: { name: "bracket.png", size: 1024 * 1024 },
      previewUrl: "/uploads/materials/.tmp/bracket.png",
      error: null,
      inputRef: React.createRef<HTMLInputElement>(),
      onChange: () => undefined,
    })
  );

  assert.match(html, /alt="ตัวอย่างรูปภาพวัสดุที่เลือก"/);
  assert.match(html, /bracket\.png/);
  assert.match(html, /1\.00 MiB/);
  assert.match(html, /เปลี่ยนรูปภาพ/);
});

test("shows the current image as an optional replacement in edit mode", () => {
  const Picker = imagePicker();
  const html = renderToStaticMarkup(
    React.createElement(Picker, {
      file: null,
      previewUrl: "/uploads/materials/current.png",
      error: null,
      required: false,
      hasExistingImage: true,
      inputRef: React.createRef<HTMLInputElement>(),
      onChange: () => undefined,
    })
  );

  const input = html.match(/<input[^>]+id="material-image"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(input, /required/);
  assert.match(html, /alt="รูปภาพวัสดุปัจจุบัน"/);
  assert.match(html, /เลือกรูปใหม่/);
  assert.match(html, /หากไม่เลือก รูปปัจจุบันจะยังคงอยู่/);
});

test("requires an image before a Material PC can be created", () => {
  assert.equal(imageValidator()(null), "กรุณาเลือกรูปภาพวัสดุ");
});

test("allows an edit to keep its current image without selecting a new file", () => {
  assert.equal(imageValidator()(null, false), null);
});

test("keeps imagePath out of an update unless a replacement was uploaded", () => {
  const fields = imageUpdateFields();

  assert.deepEqual(fields(), {});
  assert.deepEqual(fields("/uploads/materials/.tmp/new.png"), {
    imagePath: "/uploads/materials/.tmp/new.png",
  });
});

test("accepts JPEG, PNG, and WebP images up to 5 MiB", () => {
  const validate = imageValidator();

  assert.equal(validate({ type: "image/jpeg", size: 5 * 1024 * 1024 }), null);
  assert.equal(validate({ type: "image/png", size: 1024 }), null);
  assert.equal(validate({ type: "image/webp", size: 1024 }), null);
});

test("rejects unsupported image types and files larger than 5 MiB", () => {
  const validate = imageValidator();

  assert.equal(
    validate({ type: "image/gif", size: 1024 }),
    "รองรับเฉพาะไฟล์ JPEG, PNG หรือ WebP"
  );
  assert.equal(
    validate({ type: "image/png", size: 5 * 1024 * 1024 + 1 }),
    "รูปภาพต้องมีขนาดไม่เกิน 5 MiB"
  );
});

test("uploads the selected image as multipart FormData without a JSON content type", async (t) => {
  const upload = (materialsApi as unknown as Record<string, unknown>)
    .uploadMaterialImage;
  assert.equal(
    typeof upload,
    "function",
    "the Materials API must expose the image upload operation"
  );

  const originalBaseUrl = process.env.API_BASE_URL;
  process.env.API_BASE_URL = "http://api.example.test/api/v1";
  t.after(() => {
    if (originalBaseUrl === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalBaseUrl;
  });

  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = String(input);
    requestInit = init;
    return new Response(
      JSON.stringify({
        imagePath: "/uploads/materials/.tmp/image.png",
        previewUrl: "/uploads/materials/.tmp/image.png",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  });

  const result = await (upload as UploadMaterialImage)(
    "access-token",
    new Blob(["image-bytes"], { type: "image/png" }),
    "material.png"
  );

  assert.equal(requestUrl, "http://api.example.test/api/v1/materials/images");
  assert.equal(requestInit?.method, "POST");
  assert.ok(requestInit?.body instanceof FormData);
  assert.ok((requestInit.body as FormData).get("file") instanceof Blob);

  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get("authorization"), "Bearer access-token");
  assert.equal(headers.has("content-type"), false);
  assert.deepEqual(result, {
    imagePath: "/uploads/materials/.tmp/image.png",
    previewUrl: "/uploads/materials/.tmp/image.png",
  });
});
