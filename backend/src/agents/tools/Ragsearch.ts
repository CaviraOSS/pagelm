import { ToolIO } from "../types"
import { getRetriever } from "../../utils/database/db"
import { embeddings } from "../../utils/llm/llm"

function toStr(x: unknown) { if (x == null) return ""; if (typeof x === "string") return x; try { return JSON.stringify(x) } catch { return String(x) } }

export const Ragsearch: ToolIO = {
  name: "rag.search",
  desc: "Retrieve top-k passages from namespace (json/chroma) for a query.",
  schema: { type: "object", properties: { q: { type: "string" }, ns: { type: "string" }, k: { type: "number" } }, required: [] },
  run: async (input: any, ctx: Record<string, any>) => {
    const q = toStr(input?.q ?? ctx?.q ?? "").trim()
    const ns = toStr(input?.ns ?? ctx?.ns ?? "pagelm").trim() || "pagelm"
    const kNum = Number(input?.k ?? 6); const k = Number.isFinite(kNum) && kNum > 0 ? Math.min(kNum, 20) : 6
    if (!q) return [{ text: "" }]
    const retriever = await getRetriever(ns, embeddings)
    const docs = await retriever.invoke(q)
    const out = (docs || []).slice(0, k).map((d: any) => ({ text: toStr(d?.pageContent || ""), meta: d?.metadata || {} }))
    return out.length ? out : [{ text: "" }]
  }
}