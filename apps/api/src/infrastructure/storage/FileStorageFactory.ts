import type { IFileStorage } from './IFileStorage.js'
import { LocalFileStorage } from './LocalFileStorage.js'
import { S3FileStorage } from './S3FileStorage.js'
import { env } from '../../shared/env.js'

let _instance: IFileStorage | null = null

export function getFileStorage(): IFileStorage {
  if (_instance) return _instance

  if (env.STORAGE_PROVIDER === 's3') {
    _instance = new S3FileStorage({
      bucket:        env.S3_BUCKET!,
      region:        env.S3_REGION!,
      accessKey:     env.S3_ACCESS_KEY!,
      secretKey:     env.S3_SECRET_KEY!,
      endpoint:      env.S3_ENDPOINT ?? undefined,
      publicBaseUrl: env.S3_PUBLIC_URL ?? undefined,
    })
  } else {
    _instance = new LocalFileStorage(env.OCR_UPLOAD_DIR, env.APP_URL)
  }

  return _instance
}
