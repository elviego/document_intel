import { extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { IFileStorage, SaveResult } from './IFileStorage.js'

export interface S3Config {
  bucket:    string
  region:    string
  accessKey: string
  secretKey: string
  endpoint?: string  // Cloudflare R2, MinIO, etc.
  publicBaseUrl?: string
}

export class S3FileStorage implements IFileStorage {
  readonly provider = 's3'
  private readonly client: S3Client
  private readonly bucket:  string
  private readonly publicBaseUrl: string | null

  constructor(cfg: S3Config) {
    this.bucket         = cfg.bucket
    this.publicBaseUrl  = cfg.publicBaseUrl ?? null
    this.client = new S3Client({
      region:      cfg.region,
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
      ...(cfg.endpoint ? { endpoint: cfg.endpoint, forcePathStyle: true } : {}),
    })
  }

  async save(buffer: Buffer, fileName: string, mimeType: string): Promise<SaveResult> {
    const ext         = extname(fileName) || '.bin'
    const storagePath = `ocr/${randomUUID()}${ext}`

    await this.client.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         storagePath,
      Body:        buffer,
      ContentType: mimeType,
    }))

    const publicUrl = this.publicBaseUrl ? `${this.publicBaseUrl}/${storagePath}` : null
    return { storagePath, publicUrl }
  }

  async read(storagePath: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }))
    const chunks: Uint8Array[] = []
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async delete(storagePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePath })).catch(() => {})
  }

  async getServeUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl}/${storagePath}`
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }),
      { expiresIn: expiresInSeconds },
    )
  }
}
