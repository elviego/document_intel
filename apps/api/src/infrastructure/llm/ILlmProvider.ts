export interface LlmResponse {
  content:    string
  tokensUsed: number
  model:      string
}

export interface ILlmProvider {
  complete(systemPrompt: string, userPrompt: string): Promise<LlmResponse>
  readonly providerName: string
  readonly modelName:    string
}
