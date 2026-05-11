import OpenAI from 'openai'
import type { ILlmProvider, LlmResponse } from './ILlmProvider.js'

export class OpenAiCompatibleProvider implements ILlmProvider {
  readonly providerName: string
  readonly modelName:    string
  private client: OpenAI

  constructor(opts: {
    providerName: string
    model:        string
    apiKey:       string
    baseUrl?:     string
  }) {
    this.providerName = opts.providerName
    this.modelName    = opts.model
    this.client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseUrl })
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<LlmResponse> {
    const res = await this.client.chat.completions.create({
      model:    this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.1,
    })

    return {
      content:    res.choices[0]?.message?.content ?? '',
      tokensUsed: res.usage?.total_tokens ?? 0,
      model:      res.model,
    }
  }
}
