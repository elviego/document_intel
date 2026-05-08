import type { OcrPageResult } from '../../domain/entities/OcrDocument.js'

export interface OcrEngineResult {
  pages:             OcrPageResult[]
  overallConfidence: number
  rawText:           string
  engineVersion:     string
}

export interface IOcrEngine {
  recognize(filePath: string, language: string): Promise<OcrEngineResult>
  readonly name: string
}
