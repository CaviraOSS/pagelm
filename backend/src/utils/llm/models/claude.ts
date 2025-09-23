import { ChatAnthropic } from '@langchain/anthropic'
import { OpenAIEmbeddings } from '@langchain/openai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatAnthropic({
    model: cfg.claude_model || 'claude-3-5-sonnet-latest',
    apiKey: cfg.claude || process.env.ANTHROPIC_API_KEY,
    temperature: cfg.temp ?? 0.7,
    maxTokens: cfg.max_tokens,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new OpenAIEmbeddings({
    model: cfg.embed_model || cfg.openai_embed_model || 'text-embedding-3-large',
    apiKey: cfg.openai || process.env.OPENAI_API_KEY,
  })
}