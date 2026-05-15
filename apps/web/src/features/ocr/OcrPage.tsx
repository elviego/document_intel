import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api-client'
import {
  useOcrDocuments, useUploadDocument, useBatchUpload,
  useProcessDocument, useDeleteDocument, useCancelProcessing,
} from './hooks/useOcr'
import type { OcrDocument, OcrDocumentType, OcrStatus } from './hooks/useOcr'
import { ConfidenceBadge } from './components/ConfidenceBadge'

export const DOC_TYPES: { value: OcrDocumentType; label: string }[] = [
  { value: 'invoice',        label: 'Invoice' },
  { value: 'receipt',        label: 'Receipt' },
  { value: 'contract',       label: 'Contract' },
  { value: 'id_document',    label: 'ID Document' },
  { value: 'medical',        label: 'Medical' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'form',           label: 'Form' },
  { value: 'other',          label: 'Other' },
]

const STATUS_VARIANT: Record<OcrStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  pending: 'gray', processing: 'blue', completed: 'green', failed: 'red',
} as any

function fmtSize(bytes: number) {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [files,        setFiles]        = useState<File[]>([])
  const [autoDetect,   setAutoDetect]   = useState(true)
  const [documentType, setDocumentType] = useState<OcrDocumentType | ''>('')
  const [autoProcess,  setAutoProcess]  = useState(true)
  const [dragOver,     setDragOver]     = useState(false)
  const [batchResults, setBatchResults] = useState<{ fileName: string; id?: string; error?: string }[] | null>(null)

  const upload      = useUploadDocument()
  const batchUpload = useBatchUpload()

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    setFiles(prev => [...prev, ...Array.from(incoming)])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleSubmit = async () => {
    if (files.length === 0) return
    if (files.length === 1) {
      const fd = new FormData()
      fd.append('file', files[0])
      fd.append('autoDetectType', String(autoDetect))
      fd.append('autoProcess',    String(autoProcess))
      if (!autoDetect && documentType) fd.append('documentType', documentType)
      await upload.mutateAsync(fd)
      handleClose()
    } else {
      const fd = new FormData()
      for (const f of files) fd.append('file', f)
      fd.append('autoDetectType', String(autoDetect))
      fd.append('autoProcess',    String(autoProcess))
      if (!autoDetect && documentType) fd.append('documentType', documentType)
      const res = await batchUpload.mutateAsync(fd)
      setBatchResults(res.results)
    }
  }

  const handleClose = () => {
    onClose(); setFiles([]); setBatchResults(null)
    upload.reset(); batchUpload.reset()
  }

  const isPending = upload.isPending || batchUpload.isPending

  if (batchResults) {
    return (
      <Modal open={open} onClose={handleClose} title={`Batch — ${batchResults.length} files`}>
        <div className="space-y-1 max-h-64 overflow-auto font-mono text-xs">
          {batchResults.map((r, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100">
              <span className="truncate text-gray-700">{r.fileName}</span>
              {r.error
                ? <span className="text-red-500 ml-2 shrink-0">{r.error}</span>
                : <span className="text-emerald-600 ml-2 shrink-0">✓</span>}
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleClose}>Close</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload Document">
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
            className="hidden" onChange={e => addFiles(e.target.files)} />
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-mono text-gray-700">
                  <span className="truncate">{f.name}</span>
                  <span className="text-gray-400 ml-3 shrink-0">{fmtSize(f.size)}</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">Click to add more files</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Drop files here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">PDF · PNG · JPG · TIFF · BMP · WebP</p>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <button onClick={() => setFiles([])} className="text-xs text-red-400 hover:text-red-600 font-mono">
            Clear all
          </button>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoDetect} onChange={e => setAutoDetect(e.target.checked)}
            className="rounded-sm border-gray-300 text-brand-600" />
          <span className="text-xs text-gray-700">Auto-detect document type with AI</span>
        </label>

        {!autoDetect && (
          <select value={documentType} onChange={e => setDocumentType(e.target.value as OcrDocumentType)}
            className="w-full border border-gray-300 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono">
            <option value="">— Select type —</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={autoProcess} onChange={e => setAutoProcess(e.target.checked)}
            className="rounded-sm border-gray-300 text-brand-600" />
          <span className="text-xs text-gray-700">Process immediately after upload</span>
        </label>

        {(upload.isError || batchUpload.isError) && (
          <p className="text-xs text-red-500 font-mono">{errorMessage(upload.error ?? batchUpload.error)}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={handleClose} disabled={isPending}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={files.length === 0 || isPending}>
          {isPending ? 'Uploading…' : files.length > 1 ? `Upload ${files.length} files` : 'Upload'}
        </Button>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [page, setPage]         = useState(0)
  const { data, isLoading }     = useOcrDocuments(page)
  const process                 = useProcessDocument()
  const cancel                  = useCancelProcessing()
  const remove                  = useDeleteDocument()

  const docs  = data?.items  ?? []
  const total = data?.total  ?? 0

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Documents"
        subtitle={`${total} records`}
        actions={
          <>
            <Link to="/ocr/config"><Button variant="ghost" size="sm">Config</Button></Link>
            <Link to="/ocr/metrics"><Button variant="ghost" size="sm">Metrics</Button></Link>
            <Button size="sm" onClick={() => setShowUpload(true)}>+ Upload</Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <p className="text-xs text-gray-400 font-mono py-8 text-center">Loading…</p>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 text-gray-300 text-2xl">▤</div>
            <p className="text-sm text-gray-400">No documents yet</p>
            <Button size="sm" className="mt-4" onClick={() => setShowUpload(true)}>Upload first document</Button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">File</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">Type</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">Status</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">Confidence</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">Size</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 font-mono">Uploaded</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 group transition-colors">
                    <td className="px-4 py-2.5">
                      <Link to={`/ocr/${doc.id}`} className="font-mono text-xs text-brand-600 hover:text-brand-500 hover:underline">
                        {doc.fileName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-gray-500 uppercase">
                        {doc.documentType
                          ? DOC_TYPES.find(t => t.value === doc.documentType)?.label ?? doc.documentType
                          : <span className="text-gray-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={STATUS_VARIANT[doc.status]}>{doc.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <ConfidenceBadge document={doc} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400 tabular-nums">{fmtSize(doc.fileSizeBytes)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400 tabular-nums">{format(new Date(doc.createdAt), 'yyyy-MM-dd HH:mm')}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {doc.status === 'processing' || doc.status === 'pending' ? (
                          <button
                            className="text-xs text-red-500 hover:text-red-700 font-mono uppercase tracking-wide"
                            onClick={() => cancel.mutate(doc.id)}
                            disabled={cancel.isPending}
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            className="text-xs text-gray-500 hover:text-brand-600 font-mono uppercase tracking-wide"
                            onClick={() => process.mutate({ id: doc.id })}
                            disabled={process.isPending}
                          >
                            {doc.status === 'completed' ? 'Re-run' : 'Run'}
                          </button>
                        )}
                        <Link to={`/ocr/${doc.id}`} className="text-xs text-gray-400 hover:text-gray-700 font-mono uppercase tracking-wide">View</Link>
                        <button
                          className="text-xs text-red-400 hover:text-red-600 font-mono uppercase tracking-wide"
                          onClick={() => { if (confirm('Delete this document?')) remove.mutate(doc.id) }}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 50 && (
          <div className="flex items-center justify-between mt-4 font-mono text-xs text-gray-400">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="disabled:opacity-30 hover:text-gray-600">← Prev</button>
            <span>{page + 1} / {Math.ceil(total / 50)}</span>
            <button disabled={(page + 1) * 50 >= total} onClick={() => setPage(p => p + 1)} className="disabled:opacity-30 hover:text-gray-600">Next →</button>
          </div>
        )}
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} />
    </div>
  )
}
