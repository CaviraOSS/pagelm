import { PlanPolicy, Slot, Task, WeeklyPlan } from "./types"

const DAY_MS = 24 * 3600 * 1000

export function defaultPolicy(cram = false): PlanPolicy {
    return { pomodoroMins: 25, breakMins: 5, maxPerDayMins: cram ? 360 : 240, cram }
}

function freeWindows(now: number, dueAt: number): { start: number; end: number }[] {
    const out: { start: number; end: number }[] = []
    let d = new Date(now)
    d.setSeconds(0, 0)
    for (let i = 0; i < 14; i++) {
        const dayStart = new Date(d)
        dayStart.setHours(8, 0, 0, 0)
        const dayEnd = new Date(d)
        dayEnd.setHours(22, 0, 0, 0)
        const s = Math.max(dayStart.getTime(), now)
        const e = Math.min(dayEnd.getTime(), dueAt)
        if (e > s) out.push({ start: s, end: e })
        d = new Date(d.getTime() + DAY_MS)
        if (d.getTime() > dueAt) break
    }
    return out
}

export function planTask(t: Task, policy: PlanPolicy): Task {
    const now = Date.now()
    const win = freeWindows(now, t.dueAt)
    const slots: Slot[] = []
    let remaining = Math.max(1, t.estMins)
    let sid = 0
    for (const w of win) {
        let cur = w.start
        let dayMins = 0
        while (cur < w.end && remaining > 0) {
            if (policy.maxPerDayMins && dayMins >= policy.maxPerDayMins) break
            const focus = Math.min(policy.pomodoroMins, remaining)
            const start = cur
            const end = Math.min(w.end, start + focus * 60000)
            slots.push({ id: `${t.id}-${++sid}`, taskId: t.id, start, end, kind: "focus" })
            cur = end + policy.breakMins * 60000
            dayMins += focus
            remaining -= focus
        }
        if (remaining <= 0) break
    }
    const plan = { slots, policy, lastPlannedAt: Date.now() }
    return { ...t, plan }
}

export function weeklyPlan(tasks: Task[], policy: PlanPolicy): WeeklyPlan {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const days = [] as { date: string; slots: Slot[] }[]
    for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * DAY_MS)
        days.push({ date: d.toISOString().slice(0, 10), slots: [] })
    }
    for (const t of tasks) {
        const tt = t.plan?.slots || []
        for (const s of tt) {
            const di = Math.floor((new Date(s.start).getTime() - start.getTime()) / DAY_MS)
            if (di >= 0 && di < 7) days[di].slots.push(s)
        }
    }
    for (const d of days) d.slots.sort((a, b) => a.start - b.start)
    return { days }
}
