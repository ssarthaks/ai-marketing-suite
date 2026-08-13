declare module "pdf-parse" {
  function pdfParse(
    dataBuffer: Buffer | Uint8Array,
    options?: any
  ): Promise<{
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }>;
  export default pdfParse;
}

declare module "officeparser" {
  export function parseOffice(
    fileBufferOrPath: Buffer | string,
    config?: any
  ): Promise<string>;
  export function parseOfficeAsync(
    fileBufferOrPath: Buffer | string,
    config?: any
  ): Promise<string>;
  const officeParser: {
    parseOffice: typeof parseOffice;
    parseOfficeAsync: typeof parseOfficeAsync;
  };
  export default officeParser;
}
