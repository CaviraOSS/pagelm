import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatOpenAI({
    model: cfg.openrouter_model || 'google/gemini-2.5-flash',
    apiKey: cfg.openrouter || '',
    configuration: { baseURL: 'https://openrouter.ai/api/v1' },
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openrouter || process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: 'https://openrouter.ai/api/v1' },
  })
}