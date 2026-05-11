import type { ILlmProvider } from './ILlmProvider.js'
import { AnthropicProvider } from './AnthropicProvider.js'
import { OpenAiCompatibleProvider } from './OpenAiCompatibleProvider.js'
import type { LlmProvider } from '../../domain/entities/OcrDocument.js'

const OLLAMA_DEFAULTS = { baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama' }
const DEEPSEEK_DEFAULTS = { baseUrl: 'https://api.deepseek.com/v1' }

export function buildLlmProvider(provider: LlmProvider): ILlmProvider {
  const key   = provider.apiKey ?? ''
  const model = provider.defaultModel

  switch (provider.providerType) {
    case 'anthropic':
      return new AnthropicProvider({ apiKey: key, model })

    case 'ollama':
      return new OpenAiCompatibleProvider({
        providerName: 'ollama',
        model,
        apiKey:   provider.apiKey ?? OLLAMA_DEFAULTS.apiKey,
        baseUrl:  provider.baseUrl ?? OLLAMA_DEFAULTS.baseUrl,
      })

    case 'deepseek':
      return new OpenAiCompatibleProvider({
        providerName: 'deepseek',
        model,
        apiKey:  key,
        baseUrl: provider.baseUrl ?? DEEPSEEK_DEFAULTS.baseUrl,
      })

    case 'openai':
      return new OpenAiCompatibleProvider({
        providerName: 'openai',
        model,
        apiKey:  key,
        baseUrl: provider.baseUrl ?? undefined,
      })

    case 'custom':
    default:
      return new OpenAiCompatibleProvider({
        providerName: provider.name,
        model,
        apiKey:  key,
        baseUrl: provider.baseUrl ?? undefined,
      })
  }
}
