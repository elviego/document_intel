import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { errorMessage } from '@/lib/api-client'
import {
  useLlmProviders, useCreateLlmProvider, useUpdateLlmProvider,
  useDeleteLlmProvider, useSetDefaultProvider, useOcrConfigs, useUpdateOcrConfig,
} from './hooks/useOcrConfig'
import type { LlmProvider, LlmProviderType, OcrDocumentConfig } from './hooks/useOcrConfig'
import type { OcrDocumentType } from './hooks/useOcr'

const PROVIDER_TYPES: { value: LlmProviderType; label: string; hint: string }[] = [
  { value: 'anthropic', label: 'Anthropic (Claude)',         hint: 'Claude 3.5 Sonnet, Claude 3 Opus…' },
  { value: 'openai',    label: 'OpenAI',                     hint: 'GPT-4o, GPT-4 Turbo…' },
  { value: 'ollama',    label: 'Ollama (local)',              hint: 'Llama 3, Mistral, Phi…' },
  { value: 'deepseek',  label: 'DeepSeek',                   hint: 'deepseek-chat, deepseek-reasoner…' },
  { value: 'custom',    label: 'Custom (OpenAI-compatible)', hint: 'Any OpenAI-compatible endpoint' },
]

const DOC_TYPE_LABELS: Record<OcrDocumentType, string> = {
  invoice:       'Invoice',
  receipt:       'Receipt',
  contract:      'Contract',
  id_document:   'ID Document',
  medical:       'Medical',
  bank_statement:'Bank Statement',
  form:          'Form',
  other:         'Other',
}

// ── Provider form modal ──────────────────────────────────────────────────────

function ProviderModal({
  open, onClose, existing,
}: {
  open: boolean; onClose: () => void; existing?: LlmProvider
}) {
  const { t } = useTranslation()
  const create = useCreateLlmProvider()
  const update = useUpdateLlmProvider()

  const [form, setForm] = useState({
    name:         existing?.name         ?? '',
    providerType: existing?.providerType ?? 'openai' as LlmProviderType,
    baseUrl:      existing?.baseUrl      ?? '',
    apiKey:       '',
    defaultModel: existing?.defaultModel ?? '',
    isActive:     existing?.isActive     ?? true,
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const setCheck = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.checked }))

  const handleSubmit = async () => {
    const body: any = {
      name:         form.name,
      providerType: form.providerType,
      baseUrl:      form.baseUrl || null,
      defaultModel: form.defaultModel,
      isActive:     form.isActive,
      isDefault:    existing?.isDefault ?? false,
    }
    if (form.apiKey) body.apiKey = form.apiKey

    if (existing) {
      await update.mutateAsync({ id: existing.id, ...body })
    } else {
      await create.mutateAsync(body)
    }
    onClose()
  }

  const isPending = create.isPending || update.isPending
  const error     = create.error || update.error

  const modelPlaceholder = PROVIDER_TYPES.find(p => p.value === form.providerType)?.hint ?? ''

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit LLM Provider' : 'Add LLM Provider'}>
      <div className="space-y-3">
        <Input label="Name" value={form.name} onChange={set('name')} placeholder="My Claude provider" />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Provider type</label>
          <select
            value={form.providerType}
            onChange={set('providerType')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {PROVIDER_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <Input
          label="API Key"
          type="password"
          value={form.apiKey}
          onChange={set('apiKey')}
          placeholder={existing ? '(leave blank to keep existing)' : 'sk-…'}
        />

        <Input
          label="Base URL (optional)"
          value={form.baseUrl}
          onChange={set('baseUrl')}
          placeholder={
            form.providerType === 'ollama'    ? 'http://localhost:11434/v1' :
            form.providerType === 'deepseek'  ? 'https://api.deepseek.com/v1' :
            'https://api.openai.com/v1'
          }
        />

        <Input
          label="Default model"
          value={form.defaultModel}
          onChange={set('defaultModel')}
          placeholder={modelPlaceholder}
        />

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={setCheck('isActive')}
            className="rounded border-gray-300 text-brand-600"
          />
          Active
        </label>

        {error && <p className="text-sm text-red-600">{errorMessage(error)}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose} disabled={isPending}>{t('common.cancel')}</Button>
        <Button onClick={handleSubmit} disabled={!form.name || !form.defaultModel || isPending}>
          {isPending ? t('common.loading') : t('common.save')}
        </Button>
      </div>
    </Modal>
  )
}

// ── Doc-type config row ───────────────────────────────────────────────────────

function ConfigRow({
  cfg, providers,
}: {
  cfg: OcrDocumentConfig
  providers: LlmProvider[]
}) {
  const { t }  = useTranslation()
  const update = useUpdateOcrConfig()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    ocrLanguage:    cfg.ocrLanguage,
    ocrDpi:         String(cfg.ocrDpi ?? 300),
    llmProviderId:  cfg.llmProviderId ?? '',
    llmModel:       cfg.llmModel ?? '',
    llmPromptTemplate: cfg.llmPromptTemplate ?? '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    await update.mutateAsync({
      documentType:   cfg.documentType,
      ocrLanguage:    form.ocrLanguage,
      ocrDpi:         Number(form.ocrDpi) || 300,
      llmProviderId:  form.llmProviderId || null,
      llmModel:       form.llmModel      || null,
      llmPromptTemplate: form.llmPromptTemplate || null,
    })
    setOpen(false)
  }

  const activeProvider = providers.find(p => p.id === cfg.llmProviderId)

  return (
    <>
      <tr className="hover:bg-gray-50 group">
        <td className="py-2 pr-4 font-medium text-gray-800">{DOC_TYPE_LABELS[cfg.documentType]}</td>
        <td className="py-2 pr-4 text-gray-600">{cfg.ocrEngine} / {cfg.ocrLanguage}</td>
        <td className="py-2 pr-4 text-gray-600">{cfg.ocrDpi ?? 300} dpi</td>
        <td className="py-2 pr-4 text-gray-600">
          {activeProvider
            ? <span>{activeProvider.name} <span className="text-gray-400">({cfg.llmModel || activeProvider.defaultModel})</span></span>
            : <span className="text-gray-400">—</span>}
        </td>
        <td className="py-2">
          <button
            className="text-xs text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setOpen(true)}
          >
            Edit
          </button>
        </td>
      </tr>

      <Modal open={open} onClose={() => setOpen(false)} title={`Config — ${DOC_TYPE_LABELS[cfg.documentType]}`}>
        <div className="space-y-3">
          <Input label="OCR Language(s)" value={form.ocrLanguage} onChange={set('ocrLanguage')} placeholder="por+eng" />
          <Input label="DPI" type="number" value={form.ocrDpi} onChange={set('ocrDpi')} placeholder="300" />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">LLM Provider</label>
            <select
              value={form.llmProviderId}
              onChange={set('llmProviderId')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">— Use system default —</option>
              {providers.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Model override (optional)"
            value={form.llmModel}
            onChange={set('llmModel')}
            placeholder="Leave blank to use provider default"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Custom extraction prompt (optional)</label>
            <textarea
              value={form.llmPromptTemplate}
              onChange={set('llmPromptTemplate')}
              rows={4}
              placeholder="Custom instructions for extracting data from this document type…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OcrConfigPage() {
  const { t } = useTranslation()
  const { data: providers = [], isLoading: providersLoading } = useLlmProviders()
  const { data: configs   = [], isLoading: configsLoading   } = useOcrConfigs()
  const deleteProvider = useDeleteLlmProvider()
  const setDefault     = useSetDefaultProvider()
  const [showAdd, setShowAdd]       = useState(false)
  const [editProvider, setEditProvider] = useState<LlmProvider | undefined>()

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={t('ocr.configTitle')}
        subtitle={t('ocr.configSubtitle')}
      />

      <div className="flex-1 overflow-auto px-8 pb-8 space-y-10">

        {/* LLM Providers */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">LLM Providers</h2>
            <Button size="sm" onClick={() => { setEditProvider(undefined); setShowAdd(true) }}>
              + Add provider
            </Button>
          </div>

          {providersLoading ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : providers.length === 0 ? (
            <p className="text-sm text-gray-500">No providers configured. Add one to enable LLM extraction.</p>
          ) : (
            <div className="space-y-3">
              {providers.map(p => (
                <div key={p.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                      {p.isDefault && <Badge variant="green">Default</Badge>}
                      {!p.isActive && <Badge variant="gray">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {PROVIDER_TYPES.find(t => t.value === p.providerType)?.label} · {p.defaultModel}
                      {p.baseUrl && <> · {p.baseUrl}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {!p.isDefault && (
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => setDefault.mutate(p.id)}
                        disabled={setDefault.isPending}
                      >
                        Set default
                      </button>
                    )}
                    <button
                      className="text-brand-600 hover:underline"
                      onClick={() => { setEditProvider(p); setShowAdd(true) }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => { if (confirm('Delete this provider?')) deleteProvider.mutate(p.id) }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Per-type configs */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Per-Document-Type Configuration
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Configure OCR language, resolution, and LLM provider per document type.
            If no provider is set for a type, the system default provider is used.
          </p>

          {configsLoading ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="pb-2 pr-4 font-medium">Document type</th>
                  <th className="pb-2 pr-4 font-medium">OCR engine / language</th>
                  <th className="pb-2 pr-4 font-medium">Resolution</th>
                  <th className="pb-2 pr-4 font-medium">LLM provider / model</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map(cfg => (
                  <ConfigRow key={cfg.documentType} cfg={cfg} providers={providers} />
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {showAdd && (
        <ProviderModal
          open={showAdd}
          onClose={() => { setShowAdd(false); setEditProvider(undefined) }}
          existing={editProvider}
        />
      )}
    </div>
  )
}
