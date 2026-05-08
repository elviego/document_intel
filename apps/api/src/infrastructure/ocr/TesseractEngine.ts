import Tesseract from 'tesseract.js'
import type { IOcrEngine, OcrEngineResult } from './IOcrEngine.js'
import type { OcrPageResult } from '../../domain/entities/OcrDocument.js'

export class TesseractEngine implements IOcrEngine {
  readonly name = 'tesseract'

  async recognize(filePath: string, language: string): Promise<OcrEngineResult> {
    const langs = language || 'por+eng'

    const result = await Tesseract.recognize(filePath, langs, { logger: () => {} })
    const { data } = result

    const wordCount = data.text ? data.text.split(/\s+/).filter(Boolean).length : 0
    const page: OcrPageResult = {
      pageNumber: 1,
      confidence: (data.confidence ?? 0) / 100,
      wordCount,
      rawText:    data.text ?? '',
    }

    return {
      pages:             [page],
      overallConfidence: page.confidence,
      rawText:           data.text ?? '',
      engineVersion:     '5.x',
    }
  }
}
