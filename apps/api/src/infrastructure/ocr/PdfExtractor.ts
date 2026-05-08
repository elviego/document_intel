import { readFile } from 'node:fs/promises'
import type { OcrEngineResult } from './IOcrEngine.js'
import type { IOcrEngine } from './IOcrEngine.js'
import type { OcrPageResult } from '../../domain/entities/OcrDocument.js'

// Lazy import to avoid ESM/CJS conflicts at startup
async function parsePdf(buffer: Buffer) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = await import('pdf-parse') as any
  const fn  = mod.default ?? mod
  return fn(buffer) as Promise<{ text: string; numpages: number }>
}

export class PdfExtractor implements IOcrEngine {
  readonly name = 'pdf-parse'

  async recognize(filePath: string, _language: string): Promise<OcrEngineResult> {
    const buffer = await readFile(filePath)
    const data = await parsePdf(buffer)

    const text = data.text ?? ''
    const words = text.split(/\s+/).filter(Boolean)

    const page: OcrPageResult = {
      pageNumber: 1,
      confidence: text.trim().length > 0 ? 1.0 : 0,
      wordCount:  words.length,
      rawText:    text,
    }

    return {
      pages:             [page],
      overallConfidence: page.confidence,
      rawText:           text,
      engineVersion:     'pdf-parse/1.x',
    }
  }
}
