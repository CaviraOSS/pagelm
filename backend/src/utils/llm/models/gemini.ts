import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

export const makeLLM: MkLLM = (cfg: any) => {
  const m = new ChatGoogleGenerativeAI({
    model: cfg.gemini_model || 'gemini-1.5-pro',
    apiKey: cfg.gemini || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    temperature: cfg.temp ?? 1,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: cfg.max_tokens || 16384,
  })
  return wrapChat(m)
}

export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  return new GoogleGenerativeAIEmbeddings({
    model: cfg.gemini_embed_model || 'text-embedding-004',
    apiKey: cfg.gemini || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  })
}