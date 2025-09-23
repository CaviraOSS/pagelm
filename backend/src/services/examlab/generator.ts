import fs from "fs"
import path from "path"
import crypto from "crypto"
import { StateGraph, Annotation } from "@langchain/langgraph"
import llm from "../../utils/llm/llm"
import { GenSpec, QuizLikeItem } from "./types"
import { normalizeTopic } from "../../utils/text/normalize"

export type QuizItem = {
  id: number
  question: string
  options: string[]
  correct: number
  hint: string
  explanation: string
}

const SYS = (count: number, style?: string, difficulty?: string, topic?: string) => `PRIMARY OBJECTIVE
Generate exactly ${count} multiple-choice questions about the given topic.

OUTPUT CONTRACT
Return only a JSON array with ${count} objects.
No markdown, no code fences, no prose outside the JSON.

SCHEMA
"id": 1..${count}
"question": plain English, 12..160 chars, unambiguous
"options": array of exactly 4 distinct strings; each 6..80 chars; each prefixed with A) , B) , C) , D)  OR  1) , 2) , 3) , 4)
"correct": 1|2|3|4 (1-based index into options)
"hint": 6..120 chars
"explanation": 12..200 chars

STYLE
Plain text only. ASCII. No LaTeX. No extra keys or nesting.
${style ? `Style: ${style}` : ""} ${difficulty ? `Difficulty: ${difficulty}` : ""} ${topic ? `Topic: ${topic}` : ""}`.trim()

const SYS_STRICT = (count: number) => `RETRY: STRICT FORMAT ONLY

OUTPUT
Only a JSON array with ${count} objects. No markdown. No extra text.

FIELDS
id 1..${count}
question 12..160 chars
options exactly 4 strings; prefixed A) , B) , C) , D)  OR  1) , 2) , 3) , 4)
correct 1|2|3|4
hint 6..120 chars
explanation 12..200 chars`

function stripFences(s: string) {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "").trim()
}
function extractArray(s: string) {
  const m = s.match(/\[[\s\S]*\]/)
  return m ? m[0] : s
}
function tryParse<T = unknown>(s: string): T | null {
  try { return JSON.parse(s) as T } catch { return null }
}
function nstr(x: any, min = 1, max = 240) {
  const t = String(x ?? "").replace(/\s+/g, " ").trim()
  return t.length < min ? "" : t.slice(0, max)
}
function to1_4(v: any) {
  if (typeof v === "number") return v < 1 ? 1 : v > 4 ? 4 : v
  const t = String(v ?? "").trim().toUpperCase()
  if (/^[1-4]$/.test(t)) return Number(t)
  if (t.startsWith("A")) return 1
  if (t.startsWith("B")) return 2
  if (t.startsWith("C")) return 3
  if (t.startsWith("D")) return 4
  const d = t.match(/\d/)
  if (d) { const n = Number(d[0]); if (n >= 1 && n <= 4) return n }
  return 1
}
function splitOptions(v: any) {
  if (Array.isArray(v)) return v
  if (typeof v === "string") return v.split(/[,;|]\s*/).map(s => s.trim()).filter(Boolean)
  return []
}
function cleanOptions(v: any) {
  let o = splitOptions(v).map(s => s.replace(/^\s*(?:[A-D]\)|[1-4]\))\s*/i, "").trim())
  const seen = new Set<string>(), out: string[] = []
  for (const x of o) {
    const k = x.toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(x)
    if (out.length === 4) break
  }
  while (out.length < 4) out.push(`Option ${out.length + 1}`)
  const pref = Math.random() < 0.5 ? ["A) ", "B) ", "C) ", "D) "] : ["1) ", "2) ", "3) ", "4) "]
  return out.slice(0, 4).map((t, i) => (pref[i] + t).trim())
}
function coerce(items: any, count: number): QuizItem[] {
  const arr = Array.isArray(items) ? items : []
  const out = arr.slice(0, count).map((o: any, i: number): QuizItem => {
    const q = nstr(o?.question, 12, 160) || `Question ${i + 1}`
    const opts = cleanOptions(o?.options)
    const correct = to1_4(o?.correct)
    const hint = nstr(o?.hint, 6, 120) || "Use the core idea."
    const explanation = nstr(o?.explanation, 12, 200) || "The correct option matches the main idea; others do not."
    return { id: i + 1, question: q, options: opts, correct, hint, explanation }
  })
  while (out.length < count) {
    const i = out.length
    const src = out[i - 1] || { question: `Question ${i + 1}`, options: cleanOptions([]), correct: 1, hint: "Use the core idea.", explanation: "The correct option matches the main idea; others do not." }
    const rot = src.options.map((_, k) => src.options[(k + 1) % 4])
    const corr = (src.correct % 4) + 1
    out.push({ id: i + 1, question: src.question, options: rot, correct: corr, hint: src.hint, explanation: src.explanation })
  }
  return out
}
function validItem(x: any) {
  return x
    && typeof x.id === "number"
    && typeof x.question === "string"
    && Array.isArray(x.options) && x.options.length === 4 && x.options.every((o: any) => typeof o === "string")
    && typeof x.correct === "number" && x.correct >= 1 && x.correct <= 4
    && typeof x.hint === "string"
    && typeof x.explanation === "string"
}
function validQuiz(a: any, count: number): a is QuizItem[] {
  return Array.isArray(a) && a.length === count && a.every(validItem)
}

async function ask(sys: string, user: string, tag: string) {
  const msgs = [
    { role: "system", content: sys },
    { role: "user", content: user }
  ] as const
  const r = await llm.invoke([...msgs] as any)
  const raw = typeof r === "string" ? r : String((r as any)?.content ?? "")
  const txt = extractArray(stripFences(raw))
  return tryParse<any>(txt)
}

const cacheDir = path.join(process.cwd(), "storage", "cache", "examgen")
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
const keyOf = (x: string) => crypto.createHash("sha256").update(x).digest("hex")
const readCache = (k: string) => {
  const f = path.join(cacheDir, k + ".json")
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null
}
const writeCache = (k: string, v: any) => fs.writeFileSync(path.join(cacheDir, k + ".json"), JSON.stringify(v))

type Ctx = {
  key: string
  sys: string
  user: string
  count: number
  arr: any
  norm: QuizItem[]
}

const S = Annotation.Root({
  key: Annotation<string>(),
  sys: Annotation<string>(),
  user: Annotation<string>(),
  count: Annotation<number>(),
  arr: Annotation<any>(),
  norm: Annotation<QuizItem[]>(),
})

const nCache = async (s: Ctx) => {
  const c = readCache(s.key)
  if (c) return { ...s, norm: c }
  return s
}
const nGen = async (s: Ctx) => {
  if (s.norm?.length) return s
  const parsed = await ask(s.sys, s.user, "gen")
  if (parsed) return { ...s, arr: parsed }
  return s
}
const nRetry = async (s: Ctx) => {
  if (s.norm?.length || Array.isArray(s.arr)) return s
  const parsed = await ask(SYS_STRICT(s.count), s.user, "retry")
  if (parsed) return { ...s, arr: parsed }
  return s
}
const nNormalize = async (s: Ctx) => {
  const n = coerce(s.arr, s.count)
  return { ...s, norm: n }
}
const nValidate = async (s: Ctx) => {
  if (!validQuiz(s.norm, s.count)) throw new Error("Invalid exam JSON from model")
  writeCache(s.key, s.norm)
  return s
}

const g = new StateGraph(S)
g.addNode("cache", nCache)
g.addNode("gen", nGen)
g.addNode("retry", nRetry)
g.addNode("normalize", nNormalize)
g.addNode("validate", nValidate)
  ; (g as any).addEdge("__start__", "cache")
  ; (g as any).addEdge("cache", "gen")
  ; (g as any).addEdge("gen", "retry")
  ; (g as any).addEdge("retry", "normalize")
  ; (g as any).addEdge("normalize", "validate")
  ; (g as any).addEdge("validate", "__end__")

const compiled = g.compile()

export async function generateSectionItems(gen: GenSpec, seed: string): Promise<QuizLikeItem[]> {
  if (gen.type === "mcq") {
    const count = Math.max(1, Number(gen.count || 5))
    const sys = SYS(count, gen.style, gen.difficulty, normalizeTopic(gen.topic))
    const promptNorm = normalizeTopic(gen.prompt)
    const user = `${promptNorm}\nSeed: ${seed}\nReturn only the JSON array with ${count} objects.`
    const key = keyOf(JSON.stringify({ t: "mcq", count, style: gen.style, difficulty: gen.difficulty, topic: normalizeTopic(gen.topic), prompt: promptNorm }))
    const s = await compiled.invoke({ key, sys, user, count, arr: null, norm: [] })
    return s.norm
  }
  if (gen.type === "short") {
    const count = Math.max(1, Number(gen.count || 5))
    const sys = SYS(count, gen.style, gen.difficulty, normalizeTopic(gen.topic))
    const promptNorm = normalizeTopic(gen.prompt)
    const user = `First think of ${count} strong short-answer questions for the topic and then convert each into a 4-option MCQ with one correct answer. Keep answers factual and concise.\n\n${promptNorm}\nSeed: ${seed}\nReturn only the JSON array with ${count} objects.`
    const key = keyOf(JSON.stringify({ t: "short→mcq", count, style: gen.style, difficulty: gen.difficulty, topic: normalizeTopic(gen.topic), prompt: promptNorm }))
    const s = await compiled.invoke({ key, sys, user, count, arr: null, norm: [] })
    return s.norm
  }
  return []
}