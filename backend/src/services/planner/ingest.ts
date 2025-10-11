import { Task } from "./types"

function parseEstMins(s: string): number | null {
    const m = s.match(/(~|)?\s*(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i)
    if (!m) return null
    const val = parseFloat(m[2])
    const unit = m[3].toLowerCase()
    if (unit.startsWith("h")) return Math.round(val * 60)
    return Math.round(val)
}

function parseDue(s: string): number | null {
    const now = new Date()
    const m = s.match(/\b(mon|tue|wed|thu|fri|sat|sun|today|tomorrow|tmrw|by)\b[^\d]*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    const mf = s.match(/\b(fri|sat|sun|mon|tue|wed|thu)\b/i)
    if (m) {
        let h = parseInt(m[2])
        const mm = m[3] ? parseInt(m[3]) : 0
        const ap = m[4]?.toLowerCase()
        if (ap === "pm" && h < 12) h += 12
        if (ap === "am" && h === 12) h = 0
        const d = new Date(now)
        if (mf) {
            const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
            const target = days.indexOf(mf[1].slice(0, 3).toLowerCase())
            let delta = (target - d.getDay() + 7) % 7
            if (delta === 0 && (h * 60 + mm) <= (d.getHours() * 60 + d.getMinutes())) delta = 7
            d.setDate(d.getDate() + delta)
        }
        d.setHours(h, mm, 0, 0)
        return d.getTime()
    }
    const m2 = s.match(/\b(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?\b/)
    if (m2) {
        const y = parseInt(m2[1]), mo = parseInt(m2[2]) - 1, da = parseInt(m2[3])
        const h = m2[4] ? parseInt(m2[4]) : 17
        const mm = m2[5] ? parseInt(m2[5]) : 0
        return new Date(y, mo, da, h, mm, 0, 0).getTime()
    }
    return null
}

export function ingestText(input: string): Omit<Task, "id" | "createdAt" | "updatedAt"> {
    const t = String(input || "").trim()
    const estMins = parseEstMins(t) ?? 60
    const dueAtMs = parseDue(t) ?? (Date.now() + 24 * 3600 * 1000)
    const dueAt = new Date(dueAtMs).toISOString()
    const priority: 1 | 2 | 3 | 4 | 5 = 3
    const title = t.replace(/~?\s*\d+(?:\.\d+)?\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i, "").trim()
    return {
        course: undefined,
        title: title || "Task",
        type: undefined,
        notes: undefined,
        dueAt,
        estMins,
        priority,
        status: "todo",
        source: { kind: "text" },
        plan: undefined,
        metrics: { sessions: 0, minutesSpent: 0 },
        tags: [],
        rubric: undefined
    }
}
