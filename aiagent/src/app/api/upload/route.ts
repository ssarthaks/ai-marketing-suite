import crypto from "node:crypto";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { requireActiveUser } from "@/lib/authz";
import { parseDocumentBuffer } from "@/lib/document-parser";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/server-security";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 5;
const TEXT_OUTPUT_LIMIT = 100_000;

const ALLOWED_FILE_TYPES: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream",
  ],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ],
  txt: ["text/plain", "application/octet-stream"],
  md: ["text/markdown", "text/plain", "application/octet-stream"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  json: ["application/json", "text/json", "text/plain"],
  tsv: ["text/tab-separated-values", "text/plain"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function hasExpectedSignature(buffer: Buffer, extension: string): boolean {
  if (extension === "pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (extension === "png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === "jpg" || extension === "jpeg")
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === "gif")
    return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString());
  if (extension === "webp")
    return (
      buffer.subarray(0, 4).toString() === "RIFF" &&
      buffer.subarray(8, 12).toString() === "WEBP"
    );
  if (["docx", "pptx", "xlsx"].includes(extension))
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  if (extension === "doc")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  if (["txt", "md", "csv", "json", "tsv"].includes(extension)) {
    return !buffer.subarray(0, Math.min(buffer.length, 8_192)).includes(0);
  }
  return false;
}

function containsControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function validateFile(file: File, buffer: Buffer) {
  const filename = path.basename(file.name);
  if (
    !filename ||
    filename !== file.name ||
    containsControlCharacters(filename) ||
    filename.length > 180
  ) {
    throw new Error("Invalid filename");
  }

  const extension = path.extname(filename).slice(1).toLowerCase();
  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];
  if (
    !allowedMimeTypes ||
    !allowedMimeTypes.includes(file.type || "application/octet-stream") ||
    !hasExpectedSignature(buffer, extension)
  ) {
    throw new Error(`Unsupported or invalid file: ${filename}`);
  }
  return { filename, extension };
}

function validateCloudinaryResult(
  result: UploadApiResponse,
  expectedFolder: string,
): string {
  const deliveredUrl = cloudinary.url(result.public_id, {
    resource_type: result.resource_type,
    type: "authenticated",
    sign_url: true,
    secure: true,
  });
  const url = new URL(deliveredUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !result.public_id.startsWith(`${expectedFolder}/`)
  ) {
    throw new Error("Invalid upload provider response");
  }
  return url.toString();
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await requireActiveUser();
    const limit = await rateLimit(`upload:${user.id}`, 10, 15 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many uploads. Try again later." },
        { status: 429 },
      );
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (
      !Number.isFinite(contentLength) ||
      contentLength <= 0 ||
      contentLength > MAX_REQUEST_BYTES
    ) {
      return NextResponse.json(
        { error: "Upload request is too large" },
        { status: 413 },
      );
    }

    const formData = await req.formData();
    const entries = formData.getAll("file");
    if (
      entries.length === 0 ||
      entries.length > MAX_FILES ||
      entries.some((entry) => !(entry instanceof File))
    ) {
      return NextResponse.json(
        { error: `Upload between 1 and ${MAX_FILES} files` },
        { status: 400 },
      );
    }
    const files = entries as File[];
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (
      totalBytes > MAX_REQUEST_BYTES ||
      files.some((file) => file.size <= 0 || file.size > MAX_FILE_BYTES)
    ) {
      return NextResponse.json(
        { error: "Each file must be non-empty and no larger than 10MB" },
        { status: 413 },
      );
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error("Upload provider is not configured");
    }

    const preparedUploads = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { filename, extension } = validateFile(file, buffer);
      const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(extension);

      let textContent: string | undefined;
      if (!isImage) {
        const parsed = await parseDocumentBuffer(buffer, filename);
        textContent = parsed.text
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, TEXT_OUTPUT_LIMIT);
      }
      preparedUploads.push({
        buffer,
        filename,
        isImage,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        textContent,
      });
    }

    const folder = `aiagent/${user.id}`;
    const results = [];
    const uploadedResources: Array<{
      publicId: string;
      resourceType: "image" | "raw";
    }> = [];
    try {
      for (const prepared of preparedUploads) {
        const resourceType = prepared.isImage ? "image" : "raw";
        const uploadResult = await new Promise<UploadApiResponse>(
          (resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: resourceType,
                type: "authenticated",
                folder,
                public_id: crypto.randomUUID(),
                use_filename: false,
                unique_filename: true,
                overwrite: false,
                context: { owner_id: user.id },
              },
              (error, result) => {
                if (error || !result) {
                  reject(error || new Error("Upload failed"));
                } else {
                  resolve(result);
                }
              },
            );
            uploadStream.end(prepared.buffer);
          },
        );

        uploadedResources.push({
          publicId: uploadResult.public_id,
          resourceType,
        });
        const url = validateCloudinaryResult(uploadResult, folder);
        results.push({
          id: crypto.randomUUID(),
          name: prepared.filename,
          type: prepared.mimeType,
          size: prepared.size,
          url,
          textContent: prepared.textContent,
        });
      }
    } catch (error) {
      await Promise.allSettled(
        uploadedResources.map((resource) =>
          cloudinary.uploader.destroy(resource.publicId, {
            resource_type: resource.resourceType,
            type: "authenticated",
            invalidate: true,
          }),
        ),
      );
      throw error;
    }

    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Upload request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    const message =
      error instanceof Error &&
      /^(Invalid filename|Unsupported or invalid file)/.test(error.message)
        ? error.message
        : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
