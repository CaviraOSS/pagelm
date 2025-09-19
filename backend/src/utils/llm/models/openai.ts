import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatOpenAI({
    model: cfg.openai_model || 'gpt-4o-mini',
    apiKey: cfg.openai || process.env.OPENAI_API_KEY,
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
    baseUrl: process.env.OPENAI_BASE_URL
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openai || process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL
  })
}
