declare module "pdf-parse" {
  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: unknown,
  ): Promise<{
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  }>;
  export default pdfParse;
}

declare module "officeparser" {
  export function parseOffice(
    fileBufferOrPath: Buffer | string,
    config?: unknown,
  ): Promise<string>;
  export function parseOfficeAsync(
    fileBufferOrPath: Buffer | string,
    config?: unknown,
  ): Promise<string>;
  const officeParser: {
    parseOffice: typeof parseOffice;
    parseOfficeAsync: typeof parseOfficeAsync;
  };
  export default officeParser;
}
