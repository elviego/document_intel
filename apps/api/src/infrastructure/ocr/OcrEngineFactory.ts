import type { IOcrEngine } from './IOcrEngine.js'
import { TesseractEngine } from './TesseractEngine.js'
import { PdfExtractor } from './PdfExtractor.js'

const MIME_PDF = 'application/pdf'

export function pickEngine(mimeType: string, engineName: string): IOcrEngine {
  console.log(`[OCR:factory] mimeType=${mimeType} requestedEngine=${engineName}`)
  if (mimeType === MIME_PDF) {
    console.log('[OCR:factory] → PdfExtractor (text layer + scanned fallback)')
    return new PdfExtractor()
  }
  // Images → tesseract regardless of config (only supported engine for now)
  console.log('[OCR:factory] → TesseractEngine (image)')
  return new TesseractEngine()
}
