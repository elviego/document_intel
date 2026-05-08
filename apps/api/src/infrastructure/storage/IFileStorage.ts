export interface SaveResult {
  storagePath: string  // opaque key used by read/delete/getUrl
  publicUrl:   string | null
}

export interface IFileStorage {
  save(buffer: Buffer, fileName: string, mimeType: string): Promise<SaveResult>
  read(storagePath: string): Promise<Buffer>
  delete(storagePath: string): Promise<void>
  /** Returns a URL suitable for serving the file (signed URL for S3, local path for local). */
  getServeUrl(storagePath: string, expiresInSeconds?: number): Promise<string>
  readonly provider: string
}
