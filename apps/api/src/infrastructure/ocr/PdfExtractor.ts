import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import type { IOcrEngine, OcrEngineResult } from './IOcrEngine.js'
import type { OcrPageResult } from '../../domain/entities/OcrDocument.js'
import { TesseractEngine } from './TesseractEngine.js'

async function getDocument(buffer: Buffer) {
  // pdfjs-dist legacy build works in Node.js without a worker
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any) as any
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''
  return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
}

const MIN_TEXT_CHARS_PER_PAGE = 50

export class PdfExtractor implements IOcrEngine {
  readonly name = 'pdf-parse'

  async recognize(filePath: string, language: string): Promise<OcrEngineResult> {
    const buffer = await readFile(filePath)
    let pdf: any

    try {
      pdf = await getDocument(buffer)
    } catch {
      return emptyResult()
    }

    const pageCount: number = pdf.numPages
    const pages: OcrPageResult[] = []
    let totalText = ''

    for (let i = 1; i <= pageCount; i++) {
      const page  = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text = (content.items as any[])
        .map((item: any) => item.str ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      totalText += (totalText ? '\n\n' : '') + text
      pages.push({
        pageNumber: i,
        confidence: text.length > MIN_TEXT_CHARS_PER_PAGE ? 1.0 : 0.0,
        wordCount:  text ? text.split(/\s+/).filter(Boolean).length : 0,
        rawText:    text,
      })
    }

    const hasText = totalText.trim().length > MIN_TEXT_CHARS_PER_PAGE * pageCount * 0.3

    // Scanned PDF — fall back to Tesseract via rendered images
    if (!hasText) {
      return this.recognizeScanned(buffer, language, pageCount)
    }

    const overallConfidence = pages.length
      ? pages.reduce((s, p) => s + p.confidence, 0) / pages.length
      : 0

    return { pages, overallConfidence, rawText: totalText, engineVersion: 'pdfjs/4.x' }
  }

  private async recognizeScanned(buffer: Buffer, language: string, pageCount: number): Promise<OcrEngineResult> {
    let pdf: any
    try {
      pdf = await getDocument(buffer)
    } catch {
      return emptyResult()
    }

    const { createCanvas } = await import('canvas')
    const tesseract = new TesseractEngine()
    const pages: OcrPageResult[] = []
    const tmpFiles: string[] = []

    try {
      for (let i = 1; i <= (pdf.numPages as number); i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 }) // 2× scale ≈ 150 dpi from 72dpi base

        const canvas  = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')

        await page.render({ canvasContext: context as any, viewport }).promise

        const tmpPath = join(tmpdir(), `ocr-pdf-${randomUUID()}.png`)
        const pngBuf  = canvas.toBuffer('image/png')
        await writeFile(tmpPath, pngBuf)
        tmpFiles.push(tmpPath)

        const result = await tesseract.recognize(tmpPath, language)
        const pg     = result.pages[0]
        if (pg) pages.push({ ...pg, pageNumber: i })
      }
    } finally {
      await Promise.allSettled(tmpFiles.map(f => unlink(f)))
    }

    if (pages.length === 0) return emptyResult()

    const rawText = pages.map(p => p.rawText).join('\n\n')
    const overall = pages.reduce((s, p) => s + p.confidence, 0) / pages.length

    return { pages, overallConfidence: overall, rawText, engineVersion: 'pdfjs+tesseract/4.x' }
  }
}

function emptyResult(): OcrEngineResult {
  return {
    pages: [{ pageNumber: 1, confidence: 0, wordCount: 0, rawText: '' }],
    overallConfidence: 0,
    rawText: '',
    engineVersion: 'pdfjs/4.x',
  }
}
