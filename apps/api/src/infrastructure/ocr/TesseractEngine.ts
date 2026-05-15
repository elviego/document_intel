import Tesseract from 'tesseract.js'
import type { IOcrEngine, OcrEngineResult } from './IOcrEngine.js'
import type { OcrPageResult } from '../../domain/entities/OcrDocument.js'

export class TesseractEngine implements IOcrEngine {
  readonly name = 'tesseract'

  async recognize(filePath: string, language: string): Promise<OcrEngineResult> {
    const langs = language || 'por+eng'
    console.log(`[OCR:tesseract] recognize filePath=${filePath} language=${langs}`)

    const result = await Tesseract.recognize(filePath, langs, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR:tesseract]   progress=${(m.progress * 100).toFixed(1)}%`)
        } else {
          console.log(`[OCR:tesseract]   status=${m.status}`)
        }
      },
    })
    const { data } = result

    console.log(`[OCR:tesseract] done confidence=${data.confidence} textLength=${data.text?.length ?? 0} words=${data.words?.length ?? 0}`)
    if (!data.text || data.text.trim().length === 0) {
      console.warn('[OCR:tesseract] WARNING: extracted text is empty')
    }

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
