export interface ParsedDocumentResult {
  text: string;
  fileType: string;
  charCount: number;
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 200_000;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "pptx",
  "xlsx",
  "txt",
  "md",
  "csv",
  "json",
  "tsv",
]);

function hasPrefix(buffer: Buffer, signature: number[]): boolean {
  return (
    buffer.length >= signature.length &&
    signature.every((byte, index) => buffer[index] === byte)
  );
}

function containsControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function validateDocumentSignature(buffer: Buffer, extension: string): void {
  if (
    extension === "pdf" &&
    !hasPrefix(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])
  ) {
    throw new Error("Invalid PDF document");
  }
  if (
    extension === "doc" &&
    !hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  ) {
    throw new Error("Invalid Word document");
  }
  if (
    ["docx", "pptx", "xlsx"].includes(extension) &&
    !hasPrefix(buffer, [0x50, 0x4b, 0x03, 0x04])
  ) {
    throw new Error("Invalid Office document");
  }
}

function validateOfficeArchive(buffer: Buffer): void {
  const centralSignature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  let offset = 0;
  let entries = 0;
  let totalUncompressedBytes = 0;

  while ((offset = buffer.indexOf(centralSignature, offset)) !== -1) {
    if (offset + 46 > buffer.length) throw new Error("Invalid Office archive");
    const compressedBytes = buffer.readUInt32LE(offset + 20);
    const uncompressedBytes = buffer.readUInt32LE(offset + 24);
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    if (
      compressedBytes === 0xffffffff ||
      uncompressedBytes === 0xffffffff ||
      uncompressedBytes > 20 * 1024 * 1024 ||
      (compressedBytes === 0 && uncompressedBytes > 0) ||
      (compressedBytes > 0 && uncompressedBytes / compressedBytes > 100)
    ) {
      throw new Error("Office archive exceeds safe expansion limits");
    }
    totalUncompressedBytes += uncompressedBytes;
    entries += 1;
    if (entries > 2_000 || totalUncompressedBytes > 50 * 1024 * 1024) {
      throw new Error("Office archive exceeds safe expansion limits");
    }
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  if (entries === 0) throw new Error("Invalid Office archive");
}

function decodeUtf8(buffer: Buffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

/**
 * Extracts plain text content from various file formats (.pdf, .docx, .doc, .txt, .md, .csv, .json).
 */
export async function parseDocumentBuffer(
  buffer: Buffer,
  filename: string,
): Promise<ParsedDocumentResult> {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0 ||
    buffer.length > MAX_DOCUMENT_BYTES ||
    filename.length > 180 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    containsControlCharacters(filename)
  ) {
    throw new Error("Invalid document");
  }
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Unsupported document type");
  }
  validateDocumentSignature(buffer, ext);
  let text = "";

  try {
    if (ext === "pdf") {
      const pdfModule = await import("pdf-parse");
      const pdfParse = pdfModule.default || pdfModule;
      const pdfData = await pdfParse(buffer);
      text = pdfData.text || "";
    } else if (
      ext === "docx" ||
      ext === "doc" ||
      ext === "pptx" ||
      ext === "xlsx"
    ) {
      if (ext !== "doc") {
        validateOfficeArchive(buffer);
      }
      const officeModule = await import("officeparser");
      const officeParser = officeModule.default || officeModule;
      const parser = officeParser as unknown as {
        parseOfficeAsync?: (input: Buffer) => Promise<unknown>;
        parseOffice?: (input: Buffer) => Promise<unknown>;
      };
      const parseFn =
        parser.parseOfficeAsync ||
        parser.parseOffice ||
        (typeof officeParser === "function" ? officeParser : undefined);
      if (!parseFn) throw new Error("Office parser is unavailable");
      const parsed = await parseFn(buffer);
      text = typeof parsed === "string" ? parsed : String(parsed || "");
    } else {
      text = decodeUtf8(buffer);
      if (ext === "json") JSON.parse(text);
    }
  } catch {
    throw new Error("Unable to safely parse document");
  }

  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replaceAll("\0", "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);

  if (!cleanedText) {
    throw new Error(
      `Failed to extract text content from ${filename}. File may be empty or unreadable.`,
    );
  }

  return {
    text: cleanedText,
    fileType: ext.toUpperCase(),
    charCount: cleanedText.length,
  };
}
