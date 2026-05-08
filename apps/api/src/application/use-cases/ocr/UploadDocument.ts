import { mkdir, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { IOcrRepository } from '../../../domain/repositories/IOcrRepository.js'
import type { OcrDocument, OcrDocumentType } from '../../../domain/entities/OcrDocument.js'
import { ValidationError } from '../../../shared/errors.js'

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/tiff', 'image/bmp',
  'image/webp', 'application/pdf',
])

interface UploadInput {
  fileName:       string
  mimeType:       string
  buffer:         Buffer
  autoDetectType: boolean
  documentType?:  OcrDocumentType
  uploadedBy?:    string
  uploadDir:      string
  maxFileMb:      number
}

export class UploadDocument {
  constructor(private readonly repo: IOcrRepository) {}

  async execute(input: UploadInput): Promise<OcrDocument> {
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new ValidationError(`Unsupported file type: ${input.mimeType}. Allowed: PDF, PNG, JPG, TIFF, BMP, WebP`)
    }

    const maxBytes = input.maxFileMb * 1024 * 1024
    if (input.buffer.byteLength > maxBytes) {
      throw new ValidationError(`File exceeds maximum size of ${input.maxFileMb} MB`)
    }

    await mkdir(input.uploadDir, { recursive: true })

    const ext      = extname(input.fileName) || '.bin'
    const safeName = `${randomUUID()}${ext}`
    const filePath = join(input.uploadDir, safeName)
    await writeFile(filePath, input.buffer)

    return this.repo.createDocument({
      fileName:       input.fileName,
      filePath,
      fileSizeBytes:  input.buffer.byteLength,
      mimeType:       input.mimeType,
      autoDetectType: input.autoDetectType,
      documentType:   input.documentType,
      uploadedBy:     input.uploadedBy,
    })
  }
}
