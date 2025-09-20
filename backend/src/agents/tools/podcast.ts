import fs from "fs"
import { ToolIO } from "../types"
import llm from "../../utils/llm/llm"
import { tts, type TSeg } from "../../utils/tts"

function extractFirstJsonObject(s: string) {
    let depth = 0, start = -1
    for (let i = 0; i < s.length; i++) {
        const c = s[i]
        if (c === "{") { if (depth === 0) start = i; depth++ }
        else if (c === "}") { depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1) }
    }
    return ""
}

function toText(out: any): string {
    if (!out) return ""
    if (typeof out === "string") return out
    if (typeof out?.content === "string") return out.content
    if (Array.isArray(out?.content)) return out.content.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("")
    if (Array.isArray(out?.generations) && out.generations[0]?.text) return out.generations[0].text
    return String(out ?? "")
}

export const podcastScriptTool: ToolIO = {
    name: "podcast.script",
    desc: "Generate a two-speaker podcast script JSON from prompt + material + topic.",
    schema: {
        type: "object",
        properties: {
            prompt: { type: "string" },
            material: { type: "string" },
            topic: { type: "string" }
        },
        required: ["prompt", "material", "topic"]
    },
    run: async (input: any) => {
        const prompt: string = String(input?.prompt ?? "").trim()
        const material: string = String(input?.material ?? "").trim()
        const topic: string = String(input?.topic ?? "general").trim()

        const msgs = [
            { role: "system", content: prompt },
            { role: "user", content: `topic: ${topic}\n\nmaterial:\n${material}\n\nreturn only json` }
        ] as const

        const r = await llm.invoke(msgs as any)
        const raw = toText(r).trim()
        const jsonStr = extractFirstJsonObject(raw) || raw

        try {
            const parsed = JSON.parse(jsonStr)
            if (!Array.isArray(parsed?.segments)) parsed.segments = []
            return parsed
        } catch {
            return {
                title: topic || "Podcast",
                summary: "",
                segments: [
                    { spk: "A", md: "Welcome to our podcast.", voice: undefined },
                    { spk: "B", md: "Today we discuss the topic and key insights.", voice: undefined }
                ]
            }
        }
    }
}

export const podcastTtsTool: ToolIO = {
    name: "podcast.tts",
    desc: "Synthesize audio for podcast segments using project TTS pipeline.",
    schema: {
        type: "object",
        properties: {
            segments: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        spk: { type: "string" },
                        md: { type: "string" },
                        voice: { type: "string" }
                    },
                    required: ["md"]
                }
            },
            dir: { type: "string" },
            base: { type: "string" }
        },
        required: ["segments", "dir", "base"]
    },
    run: async (input: any, ctx: Record<string, any>) => {
        const segsIn = Array.isArray(input?.segments) ? input.segments : []
        const dir = String(input?.dir ?? "").trim()
        const base = String(input?.base ?? "podcast").trim()

        if (!dir) throw new Error("podcast.tts: 'dir' is required")
        await fs.promises.mkdir(dir, { recursive: true })

        const segs: TSeg[] = segsIn.map((x: any) => ({
            text: String(x?.md ?? ""),
            voice: x?.voice ? String(x.voice) : undefined
        }))

        const emit = typeof ctx?.emit === "function" ? ctx.emit : undefined
        const outPath = await tts(segs, dir, base, emit)

        return outPath
    }
}