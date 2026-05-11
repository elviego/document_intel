import type { IOcrEngine } from './IOcrEngine.js'
import { TesseractEngine } from './TesseractEngine.js'
import { PdfExtractor } from './PdfExtractor.js'

const MIME_PDF = 'application/pdf'

export function pickEngine(mimeType: string, engineName: string): IOcrEngine {
  if (mimeType === MIME_PDF) return new PdfExtractor()
  // Images → tesseract regardless of config (only supported engine for now)
  return new TesseractEngine()
}
