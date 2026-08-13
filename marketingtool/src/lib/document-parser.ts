import "server-only";

export interface ParsedDocumentResult {
  text: string;
  fileType: string;
  charCount: number;
}

const MAX_DOCUMENT_BYTES = 7 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 200_000;
const MAX_ZIP_ENTRIES = 500;
const MAX_ZIP_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_ZIP_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_ZIP_RATIO = 50;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "docx",
  "txt",
  "md",
  "csv",
  "json",
]);

function documentExtension(filename: string) {
  const match = /\.([A-Za-z0-9]+)$/.exec(filename);
  const extension = match?.[1]?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported document type");
  }
  return extension;
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Document parsing timed out")),
        timeoutMs,
      );
      timeout.unref?.();
    }),
  ]);
}

/**
 * Validate the DOCX ZIP central directory before passing it to a parser.
 * This blocks encrypted archives, path traversal and high-expansion ZIP bombs.
 */
function assertSafeOfficeArchive(buffer: Buffer) {
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("Invalid DOCX document");
  }

  const searchStart = Math.max(0, buffer.length - 65_557);
  let endOffset = -1;
  for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0 || endOffset + 22 > buffer.length) {
    throw new Error("Invalid DOCX document");
  }

  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const entries = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entries !== entriesOnDisk ||
    entries === 0 ||
    entries > MAX_ZIP_ENTRIES ||
    entries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    centralOffset + centralSize > endOffset
  ) {
    throw new Error("Unsafe DOCX archive");
  }

  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index += 1) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    ) {
      throw new Error("Invalid DOCX archive");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nextOffset =
      offset + 46 + filenameLength + extraLength + commentLength;
    if (
      nextOffset > buffer.length ||
      (flags & 1) !== 0 ||
      ![0, 8].includes(compression) ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      uncompressedSize > MAX_ZIP_ENTRY_BYTES
    ) {
      throw new Error("Unsafe DOCX archive");
    }

    const entryName = buffer
      .subarray(offset + 46, offset + 46 + filenameLength)
      .toString("utf8");
    const segments = entryName.replace(/\\/g, "/").split("/");
    if (
      !entryName ||
      entryName.includes("\0") ||
      entryName.startsWith("/") ||
      entryName.includes("\\") ||
      segments.some((segment) => segment === "..")
    ) {
      throw new Error("Unsafe DOCX archive path");
    }

    if (
      uncompressedSize > 1024 * 1024 &&
      (compressedSize === 0 ||
        uncompressedSize / compressedSize > MAX_ZIP_RATIO)
    ) {
      throw new Error("DOCX compression ratio is unsafe");
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new Error("DOCX document expands beyond the allowed size");
    }
    offset = nextOffset;
  }

  if (offset > centralOffset + centralSize) {
    throw new Error("Invalid DOCX central directory");
  }
}

function decodeText(buffer: Buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("Text document must use UTF-8 encoding");
  }
}

/**
 * Extract plain text only from explicitly supported document formats.
 * Binary parsing failures are never treated as text.
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  filename: string,
): Promise<ParsedDocumentResult> {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0 ||
    buffer.length > MAX_DOCUMENT_BYTES
  ) {
    throw new Error("Document is empty or exceeds the 7MB limit");
  }

  const extension = documentExtension(filename);
  let text: string;

  if (extension === "pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("Invalid PDF document");
    }
    try {
      const pdfModule = await import("pdf-parse");
      const pdfParse = pdfModule.default || pdfModule;
      const pdfData = await withTimeout(
        Promise.resolve((pdfParse as any)(buffer)),
        12_000,
      );
      text = String((pdfData as any)?.text || "");
    } catch {
      throw new Error("Unable to safely parse the PDF document");
    }
  } else if (extension === "docx") {
    assertSafeOfficeArchive(buffer);
    try {
      const officeModule = await import("officeparser");
      const officeParser = officeModule.default || officeModule;
      const parseFn =
        (officeParser as any).parseOfficeAsync ||
        (officeParser as any).parseOffice ||
        officeParser;
      const parsed = await withTimeout(
        Promise.resolve(parseFn(buffer)),
        12_000,
      );
      text = typeof parsed === "string" ? parsed : String(parsed || "");
    } catch {
      throw new Error("Unable to safely parse the DOCX document");
    }
  } else {
    text = decodeText(buffer);
    if (extension === "json") {
      try {
        JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON document");
      }
    }
  }

  const cleanedText = text
    .replace(/\r\n?/g, "\n")
    .replace(/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleanedText) {
    throw new Error("The document contains no extractable text");
  }
  if (cleanedText.length > MAX_EXTRACTED_CHARS) {
    throw new Error("Extracted document text exceeds the allowed size");
  }

  return {
    text: cleanedText,
    fileType: extension.toUpperCase(),
    charCount: cleanedText.length,
  };
}
