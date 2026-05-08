import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IFileStorage, SaveResult } from './IFileStorage.js'

export class LocalFileStorage implements IFileStorage {
  readonly provider = 'local'

  constructor(
    private readonly uploadDir: string,
    private readonly baseUrl: string,
  ) {}

  async save(buffer: Buffer, fileName: string, _mimeType: string): Promise<SaveResult> {
    await mkdir(this.uploadDir, { recursive: true })
    const ext         = extname(fileName) || '.bin'
    const storagePath = join(this.uploadDir, `${randomUUID()}${ext}`)
    await writeFile(storagePath, buffer)
    return { storagePath, publicUrl: null }
  }

  async read(storagePath: string): Promise<Buffer> {
    return readFile(storagePath)
  }

  async delete(storagePath: string): Promise<void> {
    await unlink(storagePath).catch(() => {})
  }

  async getServeUrl(storagePath: string): Promise<string> {
    // The route handler will resolve the actual file; return a token path
    const encoded = encodeURIComponent(storagePath)
    return `${this.baseUrl}/v1/ocr/documents/file?path=${encoded}`
  }
}
