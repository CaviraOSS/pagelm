import { useEffect, useMemo, useRef, useState } from "react"
import PlannerMindmap from "./PlannerMindmap"
import { connectPlannerStream, plannerDelete, plannerIngest, plannerList, plannerMaterials, plannerPlan, plannerUpdate, plannerWeekly, type PlannerEvent, type PlannerSlot, type PlannerTask, type WeeklyPlan } from "../../lib/api"

function fmtTime(ts: number) {
    const d = new Date(ts)
    return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function DaySlots({ date, slots, tasks }: { date: string; slots: PlannerSlot[]; tasks: Record<string, PlannerTask> }) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-xs text-zinc-400 mb-2">{date}</div>
            <div className="space-y-2">
                {slots.length === 0 && <div className="text-zinc-500 text-sm">No slots</div>}
                {slots.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm text-zinc-200/90">
                        <div className="truncate">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-[10px] mr-2">{s.kind}</span>
                            <span className="font-medium">{tasks[s.taskId]?.title || s.taskId}</span>
                        </div>
                        <div className="text-zinc-400 text-xs">{fmtTime(s.start)} → {new Date(s.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function Planner() {
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(false)
    const [tasks, setTasks] = useState<PlannerTask[]>([])
    const [sid] = useState(() => Math.random().toString(36).slice(2, 10))
    const [plan, setPlan] = useState<WeeklyPlan | null>(null)
    const [materials, setMaterials] = useState<Record<string, any>>({})
    const wsRef = useRef<ReturnType<typeof connectPlannerStream> | null>(null)
    const [view, setView] = useState<"list" | "mindmap">("list")

    const taskIndex = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks])
    const slotsByTask = useMemo(() => {
        const m: Record<string, PlannerSlot[]> = {}
        for (const d of plan?.days || []) for (const s of d.slots) (m[s.taskId] ||= []).push(s)
        for (const k of Object.keys(m)) m[k].sort((a, b) => a.start - b.start)
        return m
    }, [plan])

    const suggestions = useMemo(() => {
        const now = Date.now()
        type Sug = { task: PlannerTask; score: number; nextSlot?: PlannerSlot }
        const out: Sug[] = []
        for (const t of tasks) {
            if (t.status === "done") continue
            const hoursLeft = Math.max(0.1, (t.dueAt - now) / 3600000)
            const planned = slotsByTask[t.id]?.length || 0
            const nextSlot = (slotsByTask[t.id] || []).find(s => s.start >= now) || (slotsByTask[t.id] || [])[0]
            let score = (t.priority || 3) * (1 / hoursLeft) + (t.estMins || 60) * 0.002
            if (!planned) score += 0.5
            if (t.status === "blocked") score -= 2
            if (t.status === "doing") score += 0.2
            out.push({ task: t, score, nextSlot })
        }
        return out.sort((a, b) => b.score - a.score).slice(0, 3)
    }, [tasks, slotsByTask])

    useEffect(() => {
        wsRef.current = connectPlannerStream(sid, (ev: PlannerEvent) => {
            if (ev.type === "plan.update") {
                setTasks(t => t.map(x => x.id === ev.taskId ? { ...x, plan: { ...(x as any).plan, slots: ev.slots } } as any : x))
                plannerWeekly(false).then(wp => setPlan(wp.plan)).catch(() => { })
            }
            if (ev.type === "daily.digest") {
                console.info("daily.digest", ev.date, ev.due)
            }
            if (ev.type === "reminder") {
                console.info("reminder", ev.text, ev.at)
            }
            if (ev.type === "materials.chunk") {
                setMaterials(m => ({ ...m, _chunks: [...(m._chunks || []), ev] }))
            }
            if (ev.type === "materials.done") { }
        })
        return () => { try { wsRef.current?.close() } catch { } }
    }, [sid])

    const reload = async () => {
        const res = await plannerList()
        setTasks(res.tasks)
        const wp = await plannerWeekly(false)
        setPlan(wp.plan)
    }

    useEffect(() => { reload() }, [])

    const add = async () => {
        if (!text.trim()) return
        setLoading(true)
        try {
            const { task } = await plannerIngest(text)
            setText("")
            setTasks(t => [task, ...t])
        } finally { setLoading(false) }
    }

    const planTask = async (id: string) => {
        const { task } = await plannerPlan(id, false)
        setTasks(t => t.map(x => x.id === id ? task as any : x))
        const wp = await plannerWeekly(false)
        setPlan(wp.plan)
    }

    const gen = async (id: string, kind: "summary" | "studyGuide" | "flashcards" | "quiz") => {
        const { data } = await plannerMaterials(id, kind)
        setMaterials(m => ({ ...m, [id]: { ...(m[id] || {}), [kind]: data } }))
    }

    const onUpload = async (_id: string, _file: File) => { }

    const del = async (id: string) => {
        await plannerDelete(id)
        setTasks(t => t.filter(x => x.id !== id))
    }

    const mark = async (id: string, status: PlannerTask["status"]) => {
        const { task } = await plannerUpdate(id, { status })
        setTasks(t => t.map(x => x.id === id ? task : x))
    }

    const startNow = async (id: string) => {
        // Mark as doing and ensure it has a plan
        await mark(id, "doing")
        if (!slotsByTask[id]?.length) await planTask(id)
    }

    const updateNotes = async (id: string, notes: string) => {
        const { task } = await plannerUpdate(id, { notes })
        setTasks(t => t.map(x => x.id === id ? task : x))
    }

    const fmtRel = (ts: number) => {
        const d = ts - Date.now()
        const sign = d < 0 ? "ago" : "in"
        const v = Math.abs(d)
        const h = Math.round(v / 3600000)
        if (h < 1) {
            const m = Math.max(1, Math.round(v / 60000))
            return `${sign} ${m}m`
        }
        return `${sign} ${h}h`
    }

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="text-zinc-200 font-medium">Homework Planner</div>
                <div className="flex items-center gap-2">
                    <div className="text-xs bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
                        <button onClick={() => setView("list")} className={`px-2 py-1 ${view === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300'}`}>List</button>
                        <button onClick={() => setView("mindmap")} className={`px-2 py-1 ${view === 'mindmap' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300'}`}>Mindmap</button>
                    </div>
                    <button onClick={reload} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-200">Refresh</button>
                </div>
            </div>

            <div className="p-4 space-y-6">
                <div className="flex gap-2">
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="e.g. Calc HW 5 by Fri 6pm ~1.5h"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-zinc-700"
                    />
                    <button onClick={add} disabled={loading} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">Add</button>
                </div>

                {view === 'mindmap' ? (
                    <div className="rounded-xl border border-zinc-800 overflow-hidden h-[75vh]">
                        <PlannerMindmap
                            tasks={tasks}
                            plan={plan}
                            onPlan={planTask}
                            onAssist={(id, kind) => gen(id, kind)}
                            onUpdateStatus={mark}
                            onUpload={onUpload}
                            onDelete={del}
                            onStartNow={startNow}
                            onUpdateNotes={updateNotes}
                        />
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {tasks.map(t => (
                            <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="text-zinc-100 font-medium truncate">{t.title}</div>
                                        <div className="text-zinc-400 text-xs">Due {fmtTime(t.dueAt)} · {t.estMins} mins · P{t.priority}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select value={t.status} onChange={e => mark(t.id, e.target.value as any)} className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1">
                                            <option value="todo">todo</option>
                                            <option value="doing">doing</option>
                                            <option value="done">done</option>
                                            <option value="blocked">blocked</option>
                                        </select>
                                        <button onClick={() => planTask(t.id)} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-200">Plan</button>
                                        <button onClick={() => gen(t.id, "summary")} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-200">Summary</button>
                                        <button onClick={() => gen(t.id, "flashcards")} className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-200">Flashcards</button>
                                        <button onClick={() => del(t.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Delete</button>
                                    </div>
                                </div>
                                {materials[t.id]?.summary && (
                                    <div className="mt-3 text-sm text-zinc-200 whitespace-pre-wrap">{materials[t.id].summary.answer || materials[t.id].summary}</div>
                                )}
                                {Array.isArray(materials[t.id]?.flashcards?.flashcards) && (
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {materials[t.id].flashcards.flashcards.map((c: any, i: number) => (
                                            <div key={i} className="border border-zinc-800 rounded-lg p-2">
                                                <div className="text-zinc-200 text-sm font-medium">Q: {c.q}</div>
                                                <div className="text-zinc-400 text-sm">A: {c.a}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {view === 'list' && (
                    <div>
                        <div className="text-zinc-300 text-sm mb-2">Weekly Plan</div>
                        {plan ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {plan.days.map(d => (
                                    <DaySlots key={d.date} date={d.date} slots={d.slots} tasks={taskIndex} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-zinc-500 text-sm">No plan yet</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
