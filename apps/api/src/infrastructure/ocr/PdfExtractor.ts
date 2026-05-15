import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { IOcrEngine, OcrEngineResult } from './IOcrEngine.js'
import type { OcrPageResult } from '../../domain/entities/OcrDocument.js'
import { TesseractEngine } from './TesseractEngine.js'

const _require = createRequire(import.meta.url)

async function getDocument(buffer: Buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any) as any
  // pdfjs-dist v4 requires a real workerSrc even in Node.js; empty string triggers "fake worker" error
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = _require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
  }
  return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise
}

const MIN_TEXT_CHARS_PER_PAGE = 100

export class PdfExtractor implements IOcrEngine {
  readonly name = 'pdf-parse'

  async recognize(filePath: string, language: string): Promise<OcrEngineResult> {
    console.log(`[OCR:pdf] recognize filePath=${filePath} language=${language}`)
    const buffer = await readFile(filePath)
    console.log(`[OCR:pdf] file size=${buffer.length} bytes`)
    let pdf: any

    try {
      pdf = await getDocument(buffer)
    } catch (err) {
      console.error(`[OCR:pdf] ERROR: pdfjs getDocument failed — ${err instanceof Error ? err.message : String(err)}`)
      return emptyResult()
    }

    const pageCount: number = pdf.numPages
    console.log(`[OCR:pdf] pageCount=${pageCount}`)
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

      console.log(`[OCR:pdf] page ${i}/${pageCount} extractedChars=${text.length} sample="${text.slice(0, 80).replace(/\n/g, '↵')}"`)

      totalText += (totalText ? '\n\n' : '') + text
      pages.push({
        pageNumber: i,
        confidence: text.length > MIN_TEXT_CHARS_PER_PAGE ? 1.0 : 0.0,
        wordCount:  text ? text.split(/\s+/).filter(Boolean).length : 0,
        rawText:    text,
      })
    }

    // Require most pages to have substantial text before trusting pdfjs
    const pagesWithText = pages.filter(p => p.rawText.length >= MIN_TEXT_CHARS_PER_PAGE).length
    const hasText = pagesWithText >= Math.ceil(pageCount * 0.5)

    console.log(`[OCR:pdf] pagesWithText=${pagesWithText}/${pageCount} threshold=${Math.ceil(pageCount * 0.5)} hasText=${hasText}`)

    // Scanned PDF — fall back to Tesseract via rendered images
    if (!hasText) {
      console.log('[OCR:pdf] → scanned PDF detected, falling back to Tesseract OCR')
      return this.recognizeScanned(buffer, language, pageCount)
    }

    console.log(`[OCR:pdf] → text-based PDF, using pdfjs extraction (totalTextLength=${totalText.length})`)
    const overallConfidence = pages.length
      ? pages.reduce((s, p) => s + p.confidence, 0) / pages.length
      : 0

    return { pages, overallConfidence, rawText: totalText, engineVersion: 'pdfjs/4.x' }
  }

  private async recognizeScanned(buffer: Buffer, language: string, pageCount: number): Promise<OcrEngineResult> {
    console.log('[OCR:pdf:scanned] starting Tesseract fallback path')
    let pdf: any
    try {
      pdf = await getDocument(buffer)
    } catch (err) {
      console.error(`[OCR:pdf:scanned] ERROR: pdfjs re-open failed — ${err instanceof Error ? err.message : String(err)}`)
      return emptyResult()
    }

    let createCanvas: any
    try {
      const canvasMod = await import('canvas') as any
      createCanvas = canvasMod.createCanvas
      console.log('[OCR:pdf:scanned] canvas module loaded OK')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[OCR:pdf:scanned] ERROR: canvas module failed to load — ${msg}`)
      console.error('[OCR:pdf:scanned] Install native deps: brew install pkg-config cairo pango libpng jpeg giflib librsvg')
      throw new Error(`canvas package not available — install native deps: ${msg}`)
    }

    const tesseract = new TesseractEngine()
    const pages: OcrPageResult[] = []
    const tmpFiles: string[] = []

    try {
      for (let i = 1; i <= (pdf.numPages as number); i++) {
        console.log(`[OCR:pdf:scanned] rendering page ${i}/${pdf.numPages}`)
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 }) // 2× scale ≈ 150 dpi from 72dpi base
        console.log(`[OCR:pdf:scanned]   viewport ${viewport.width.toFixed(0)}x${viewport.height.toFixed(0)}`)

        const canvas  = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')

        try {
          await page.render({ canvasContext: context as any, viewport }).promise
        } catch (renderErr) {
          console.error(`[OCR:pdf:scanned]   ERROR rendering page ${i}: ${renderErr instanceof Error ? renderErr.message : String(renderErr)}`)
          continue
        }

        const tmpPath = join(tmpdir(), `ocr-pdf-${randomUUID()}.png`)
        const pngBuf  = canvas.toBuffer('image/png')
        await writeFile(tmpPath, pngBuf)
        tmpFiles.push(tmpPath)
        console.log(`[OCR:pdf:scanned]   page ${i} rendered to ${tmpPath} (${pngBuf.length} bytes)`)

        const result = await tesseract.recognize(tmpPath, language)
        const pg     = result.pages[0]
        if (pg) {
          console.log(`[OCR:pdf:scanned]   page ${i} OCR done confidence=${pg.confidence.toFixed(3)} chars=${pg.rawText.length}`)
          pages.push({ ...pg, pageNumber: i })
        } else {
          console.warn(`[OCR:pdf:scanned]   page ${i} OCR returned no page result`)
        }
      }
    } finally {
      await Promise.allSettled(tmpFiles.map(f => unlink(f)))
    }

    if (pages.length === 0) {
      console.error('[OCR:pdf:scanned] ERROR: no pages extracted from scanned PDF')
      return emptyResult()
    }

    const rawText = pages.map(p => p.rawText).join('\n\n')
    const overall = pages.reduce((s, p) => s + p.confidence, 0) / pages.length
    console.log(`[OCR:pdf:scanned] complete pages=${pages.length} overallConfidence=${overall.toFixed(3)} totalChars=${rawText.length}`)

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
