export type Msg = { role: 'user' | 'assistant' | 'system'; content: string }

export interface LLM {
  invoke(m: Msg[]): Promise<any>
  call(m: Msg[]): Promise<any>
}

export type EmbeddingsLike = {
  embedDocuments(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
}

export type MkLLM = (cfg: any) => LLM
export type MkEmb = (cfg: any) => EmbeddingsLike