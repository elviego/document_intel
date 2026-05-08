import type { IFileStorage } from '../../../infrastructure/storage/IFileStorage.js'
import type { IOcrRepository } from '../../../domain/repositories/IOcrRepository.js'
import type { OcrDocument, OcrDocumentType } from '../../../domain/entities/OcrDocument.js'
import { ValidationError } from '../../../shared/errors.js'

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/tiff', 'image/bmp',
  'image/webp', 'application/pdf',
])

export interface UploadInput {
  fileName:       string
  mimeType:       string
  buffer:         Buffer
  autoDetectType: boolean
  documentType?:  OcrDocumentType
  uploadedBy?:    string
  maxFileMb:      number
}

export class UploadDocument {
  constructor(
    private readonly repo:    IOcrRepository,
    private readonly storage: IFileStorage,
  ) {}

  async execute(input: UploadInput): Promise<OcrDocument> {
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new ValidationError(`Unsupported file type: ${input.mimeType}. Allowed: PDF, PNG, JPG, TIFF, BMP, WebP`)
    }
    const maxBytes = input.maxFileMb * 1024 * 1024
    if (input.buffer.byteLength > maxBytes) {
      throw new ValidationError(`File exceeds maximum size of ${input.maxFileMb} MB`)
    }

    const { storagePath } = await this.storage.save(input.buffer, input.fileName, input.mimeType)

    return this.repo.createDocument({
      fileName:       input.fileName,
      filePath:       storagePath,
      fileSizeBytes:  input.buffer.byteLength,
      mimeType:       input.mimeType,
      autoDetectType: input.autoDetectType,
      documentType:   input.documentType,
      uploadedBy:     input.uploadedBy,
    })
  }
}
