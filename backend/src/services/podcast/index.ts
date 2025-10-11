import fs from "fs"
import llm from "../../utils/llm/llm"
import { tts, type TSeg } from "../../utils/tts"
import { execDirect } from "../../agents/runtime"
import { normalizeTopic } from "../../utils/text/normalize"

export type PSeg = { spk: string; voice?: string; md: string }
export type POut = { title: string; summary: string; segments: PSeg[] }

const P = `
ROLE
You are a professional podcast scriptwriter. 
You craft highly engaging, interactive, and natural-sounding scripts where two speakers explore ideas in a way that feels lively, curious, and practical. 
The conversation should discourage rote learning and instead highlight real-world applications, relatable daily problems, and thought-provoking examples.

OUTPUT
Return only one valid JSON object in this format:
{
 "title": "string",
 "summary": "string",
 "segments": [
   {"spk":"A|B","voice":"optional voice id","md":"markdown text of spoken dialogue"},
   ...
 ]
}

RULES
- 8–16 segments total
- Alternate speakers A and B consistently
- Each segment = 1–3 sentences max (natural spoken rhythm)
- Tone: casual, flowing, interactive — like two people thinking together, not lecturing
- Use markdown for clarity (lists, emphasis, short paragraphs, bullet points when helpful)
- Speakers should:
  * Ask and answer questions
  * Use analogies, metaphors, and relatable daily examples
  * Tie abstract ideas to concrete real-world scenarios
  * Highlight common mistakes and misconceptions
  * Encourage curiosity and exploration over memorization
- Summary: concise and enticing, like show notes
- Avoid filler; every segment should add value, humor, or a new perspective
- Make it sound alive: energy, curiosity, humor, and quick reactions
- No code fences or extra text outside the JSON

GOAL
The script should feel ready to record for a professional podcast that makes listeners think, laugh, and connect ideas to their daily lives — surpassing rote-learning style and beating competitors in engagement and clarity.
`.trim()

function j1(s: string) {
  let d = 0, b = -1
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === "{") { if (d === 0) b = i; d++ }
    else if (c === "}") { d--; if (d === 0 && b !== -1) return s.slice(b, i + 1) }
  }
  return ""
}

export async function makeScript(input: string, topic?: string): Promise<POut> {
  const top = normalizeTopic(topic || "general")

  const plan = {
    steps: [
      {
        tool: "podcast.script",
        input: { prompt: P, material: input, topic: top },
        timeoutMs: 20000,
        retries: 1
      }
    ]
  }

  try {
    const r = await execDirect({ agent: "podcaster", plan, ctx: {} })
    const out = r?.result
    if (out && typeof out === "object" && Array.isArray((out as any).segments)) {
      return out as POut
    }
  } catch (err) {
  }

  const m = [
    { role: "system", content: P },
    { role: "user", content: `topic: ${top}\n\nmaterial:\n${input}\n\nreturn only json` }
  ] as any

  const r = await llm.invoke(m)
  const t = (typeof r === "string" ? r : String((r as any)?.content || "")).trim()
  const s = j1(t) || t
  const o = JSON.parse(s)
  if (!Array.isArray(o.segments)) o.segments = []

  return o as POut
}

export async function makeAudio(o: POut, dir: string, base: string, emit?: (m: any) => void) {
  await fs.promises.mkdir(dir, { recursive: true })
  const segs: TSeg[] = o.segments.map((x) => ({ text: x.md, voice: x.voice }))
  const out = await tts(segs, dir, base, emit)
  return out
}