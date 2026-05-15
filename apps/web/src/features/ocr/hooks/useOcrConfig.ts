import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { OcrDocumentType } from './useOcr'

export type LlmProviderType = 'openai' | 'anthropic' | 'ollama' | 'deepseek' | 'custom'

export interface LlmProvider {
  id:           string
  name:         string
  providerType: LlmProviderType
  baseUrl:      string | null
  apiKey:       string | null   // always '***' from list endpoint
  defaultModel: string
  isActive:     boolean
  isDefault:    boolean
  config:       Record<string, unknown> | null
  createdAt:    string
  updatedAt:    string
}

export interface OcrDocumentConfig {
  id:                   string
  documentType:         OcrDocumentType
  ocrEngine:            string
  ocrLanguage:          string
  ocrDpi:               number | null
  preprocessingEnabled: boolean
  llmProviderId:        string | null
  llmModel:             string | null
  llmPromptTemplate:    string | null
  structuredSchema:     Record<string, unknown> | null
  createdAt:            string
  updatedAt:            string
}

// ── Providers ─────────────────────────────────────────────────────────────────

export function useLlmProviders() {
  return useQuery({
    queryKey: ['ocr-llm-providers'],
    queryFn: () => apiClient.get<LlmProvider[]>('/v1/ocr/providers'),
  })
}

export function useCreateLlmProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<LlmProvider, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiClient.post<LlmProvider>('/v1/ocr/providers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }),
  })
}

export function useUpdateLlmProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<LlmProvider> & { id: string }) =>
      apiClient.patch<LlmProvider>(`/v1/ocr/providers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }),
  })
}

export function useDeleteLlmProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/ocr/providers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }),
  })
}

export function useFetchProviderModels() {
  return useMutation({
    mutationFn: (body: { providerType: LlmProviderType; apiKey?: string; baseUrl?: string }) =>
      apiClient.post<{ models: string[] }>('/v1/ocr/providers/fetch-models', body),
  })
}

export function useSetDefaultProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.put(`/v1/ocr/providers/${id}/default`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-llm-providers'] }),
  })
}

// ── Configs ───────────────────────────────────────────────────────────────────

export function useOcrConfigs() {
  return useQuery({
    queryKey: ['ocr-configs'],
    queryFn: () => apiClient.get<OcrDocumentConfig[]>('/v1/ocr/configs'),
  })
}

export function useUpdateOcrConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ documentType, ...body }: Partial<OcrDocumentConfig> & { documentType: OcrDocumentType }) =>
      apiClient.put<OcrDocumentConfig>(`/v1/ocr/configs/${documentType}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-configs'] }),
  })
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export interface OcrWebhook {
  id: string; name: string; url: string; secret: string | null
  events: string[]; isActive: boolean; createdAt: string; updatedAt: string
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['ocr-webhooks'],
    queryFn:  () => apiClient.get<OcrWebhook[]>('/v1/ocr/webhooks'),
  })
}

export function useCreateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Omit<OcrWebhook, 'id' | 'createdAt' | 'updatedAt'>) =>
      apiClient.post<OcrWebhook>('/v1/ocr/webhooks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-webhooks'] }),
  })
}

export function useUpdateWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<OcrWebhook> & { id: string }) =>
      apiClient.patch<OcrWebhook>(`/v1/ocr/webhooks/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocr-webhooks'] }),
  })
}

export function useDeleteWebhook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/v1/ocr/webhooks/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ocr-webhooks'] }),
  })
}
