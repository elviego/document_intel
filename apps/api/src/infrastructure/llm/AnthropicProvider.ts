import Anthropic from '@anthropic-ai/sdk'
import type { ILlmProvider, LlmResponse } from './ILlmProvider.js'

export class AnthropicProvider implements ILlmProvider {
  readonly providerName = 'anthropic'
  readonly modelName:   string
  private client: Anthropic

  constructor(opts: { apiKey: string; model: string }) {
    this.modelName = opts.model
    this.client    = new Anthropic({ apiKey: opts.apiKey })
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LlmResponse> {
    const res = await this.client.messages.create({
      model:      this.modelName,
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const content = res.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    const tokensUsed = (res.usage.input_tokens ?? 0) + (res.usage.output_tokens ?? 0)

    return { content, tokensUsed, model: res.model }
  }
}
