import { ToolIO, Ctx } from "../types"
import { handleAsk } from "../../lib/ai/ask"

export const askTool: ToolIO = {
  name: "ask.generate",
  desc: "structured QA + flashcards; input: { q: string, ns?: string, k?: number }",
  schema: {},
  run: async (i: { q: string; ns?: string; k?: number }, c: Ctx) => {
    const ns = i?.ns || c?.ns
    const k = Number(i?.k || 6)
    const o = await handleAsk(i.q, ns, k)
    return o
  },
}