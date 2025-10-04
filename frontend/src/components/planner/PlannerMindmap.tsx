import { useEffect, useMemo, useRef, useState } from "react"
import { forceSimulation, forceManyBody, forceCollide, forceRadial, type Simulation } from "d3-force"
import { anchorLine } from "./mindmap/geometry"
import { plannerMaterials } from "../../lib/api"
import type { PlannerTask, PlannerSlot, WeeklyPlan } from "../../lib/api"

type Props = {
    tasks: PlannerTask[]
    plan: WeeklyPlan | null
    onPlan: (id: string) => void
    onAssist: (id: string, kind: "summary" | "flashcards" | "studyGuide" | "quiz") => void
    onUpdateStatus: (id: string, s: PlannerTask["status"]) => void
    onUpload: (id: string, file: File) => void
    onDelete: (id: string) => void
    onStartNow?: (id: string) => void
    onUpdateNotes?: (id: string, notes: string) => void
}

type Pt = { x: number; y: number }
type CustomNode = { id: string; x: number; y: number; label: string; color: string }

export default function PlannerMindmap({ tasks, plan, onPlan, onAssist, onUpdateStatus, onUpload, onDelete, onStartNow, onUpdateNotes }: Props) {
    const wrapRef = useRef<HTMLDivElement>(null)
    const [positions, setPositions] = useState<Record<string, Pt>>({})
    const [selected, setSelected] = useState<string | null>(null)
    const [drag, setDrag] = useState<{ id: string; off: Pt } | null>(null)
    const [dragCustom, setDragCustom] = useState<{ id: string; off: Pt } | null>(null)
    const [dragStep, setDragStep] = useState<{ id: string; off: Pt } | null>(null)
    const [pan, setPan] = useState<Pt>({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1.25)
    const panning = useRef<{ on: boolean; start: Pt; base: Pt } | null>(null)
    const MIN_ZOOM = 0.3
    const MAX_ZOOM = 3
    const [customNodes, setCustomNodes] = useState<CustomNode[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const [aiSteps, setAiSteps] = useState<Record<string, string[]>>({})
    const [stepPos, setStepPos] = useState<Record<string, Pt>>({}) // key `${taskId}::${label}` in world coords
    const [menuOpen, setMenuOpen] = useState<string | null>(null)
    const simsRef = useRef<Record<string, Simulation<any, any>>>({})
    const nodeMapRef = useRef<Record<string, any>>({})

    // Tiny heuristic: decide contextual steps from task title/type
    type Step = { label: string; w: number }
    function inferSteps(t: PlannerTask): Step[] {
        const title = (t.title || '').toLowerCase()
        const isEssay = /(essay|paper|report|write|draft)/.test(title)
        const isExam = /(exam|quiz|midterm|final|test|mock)/.test(title)
        const isReading = /(read|chapter|book|article)/.test(title)
        const isProblem = /(hw|pset|problem|assignment|calc|algebra|math|physics|chem|bio)/.test(title)
        if (isEssay) return [
            { label: 'Research', w: 2 },
            { label: 'Outline', w: 1 },
            { label: 'Draft', w: 3 },
            { label: 'Revise', w: 2 },
            { label: 'Proofread', w: 1 },
            { label: 'Submit', w: 1 },
        ]
        if (isExam) return [
            { label: 'Topics Map', w: 1 },
            { label: 'Flashcards', w: 2 },
            { label: 'Practice', w: 3 },
            { label: 'Weak Spots', w: 2 },
            { label: 'Mock Test', w: 2 },
            { label: 'Review', w: 1 },
        ]
        if (isReading) return [
            { label: 'Skim', w: 1 },
            { label: 'Read', w: 3 },
            { label: 'Notes', w: 2 },
            { label: 'Summary', w: 1 },
            { label: 'Discuss/Qs', w: 1 },
        ]
        if (isProblem) return [
            { label: 'Review Notes', w: 1 },
            { label: 'Examples', w: 2 },
            { label: 'Solve Set', w: 3 },
            { label: 'Check/Verify', w: 2 },
            { label: 'Write-up', w: 1 },
            { label: 'Submit', w: 1 },
        ]
        return [
            { label: 'Plan', w: 1 },
            { label: 'Research', w: 2 },
            { label: 'Make', w: 3 },
            { label: 'Review', w: 2 },
            { label: 'Polish', w: 1 },
            { label: 'Submit', w: 1 },
        ]
    }

    function stepCountsFor(t: PlannerTask, steps: Step[]) {
        const total = (slotsByTask[t.id]?.length) || 0
        if (total <= 0) return {} as Record<string, number>
        const sumW = steps.reduce((s, x) => s + x.w, 0)
        const raw = steps.map(x => ({ label: x.label, v: (total * x.w) / Math.max(1, sumW) }))
        // Round while preserving sum
        const floored = raw.map(x => ({ label: x.label, v: Math.floor(x.v) }))
        let rem = total - floored.reduce((s, x) => s + x.v, 0)
        const frac = raw.map((x, i) => ({ i, frac: x.v - Math.floor(x.v) })).sort((a, b) => b.frac - a.frac)
        for (let k = 0; k < floored.length && rem > 0; k++) { floored[frac[k].i].v++; rem-- }
        return Object.fromEntries(floored.map(x => [x.label, x.v])) as Record<string, number>
    }

    useEffect(() => {
        if (!wrapRef.current) return
        if (Object.keys(positions).length) return
        const rect = wrapRef.current.getBoundingClientRect()
        const cx = rect.width / 2
        const cy = rect.height / 2
        const r = Math.min(cx, cy) * 0.6
        const n = Math.max(1, tasks.length)
        const init: Record<string, Pt> = {}
        tasks.forEach((t, i) => {
            const ang = (i / n) * Math.PI * 2
            init[t.id] = { x: cx + r * Math.cos(ang) - 120, y: cy + r * Math.sin(ang) - 40 }
        })
        setPositions(init)
    }, [tasks])

    // Load/save custom nodes in localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("planner.customNodes")
            if (raw) setCustomNodes(JSON.parse(raw))
        } catch { }
    }, [])
    useEffect(() => {
        try { localStorage.setItem("planner.customNodes", JSON.stringify(customNodes)) } catch { }
    }, [customNodes])

    // Load cached AI steps and fetch if missing
    useEffect(() => {
        try {
            const m: Record<string, string[]> = {}
            for (const t of tasks) {
                const raw = localStorage.getItem(`planner.aiSteps.${t.id}`)
                if (raw) m[t.id] = JSON.parse(raw)
            }
            if (Object.keys(m).length) setAiSteps(s => ({ ...s, ...m }))
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks.length])
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                for (const t of tasks) {
                    if (aiSteps[t.id]) continue
                    try {
                        const res = await plannerMaterials(t.id, "studyGuide")
                        if (cancelled) return
                        const data: any = res?.data || {}
                        const labels: string[] = []
                        if (Array.isArray(data.mainConcepts)) labels.push(...data.mainConcepts)
                        if (Array.isArray(data.importantTerms)) labels.push(...data.importantTerms.map((x: any) => x?.term).filter(Boolean))
                        if (labels.length === 0 && Array.isArray(data.questions)) labels.push(...data.questions)
                        const uniq = Array.from(new Set(labels.map(x => String(x).trim()).filter(Boolean))).slice(0, 6)
                        if (uniq.length) {
                            setAiSteps(s => { const next = { ...s, [t.id]: uniq }; try { localStorage.setItem(`planner.aiSteps.${t.id}`, JSON.stringify(uniq)) } catch { }; return next })
                        }
                    } catch { }
                }
            })()
        return () => { cancelled = true }
    }, [tasks, aiSteps])

    useEffect(() => {
        setStepPos(prev => {
            const out = { ...prev }
            for (const t of tasks) {
                const base = positions[t.id]
                if (!base) continue
                const labels = aiSteps[t.id]?.length ? aiSteps[t.id]! : inferSteps(t).map(s => s.label)
                const n = Math.max(1, labels.length)
                const r = 120
                const node = nodeRefs.current[t.id]
                const w = (node?.offsetWidth ?? 140)
                const h = (node?.offsetHeight ?? 36)
                const cx = base.x + w / 2
                const cy = base.y + h / 2
                labels.forEach((label, i) => {
                    const key = `${t.id}::${label}`
                    if (out[key]) return
                    const ang = (i / n) * Math.PI * 2
                    out[key] = { x: cx + r * Math.cos(ang) - 42, y: cy + r * Math.sin(ang) - 14 }
                })
            }
            return out
        })
    }, [tasks, positions, aiSteps])

    useEffect(() => {
        for (const id of Object.keys(simsRef.current)) { try { simsRef.current[id].stop() } catch { } }
        simsRef.current = {}
        const nm: Record<string, any> = {}
        for (const t of tasks) {
            const base = positions[t.id]; if (!base) continue
            const node = nodeRefs.current[t.id]
            const w = (node?.offsetWidth ?? 140)
            const h = (node?.offsetHeight ?? 36)
            const cx = base.x + w / 2
            const cy = base.y + h / 2
            const cid = `t:${t.id}`
            const center = { id: cid, x: cx, y: cy, fx: cx, fy: cy, type: 'center' }
            const nodes: any[] = [center]
            nm[cid] = center
            const labels = aiSteps[t.id]?.length ? aiSteps[t.id]! : inferSteps(t).map(s => s.label)
            for (const label of labels) {
                const sid = `${t.id}::${label}`
                const sp = stepPos[sid]
                const sx = (sp?.x ?? (cx + 120)) + 42
                const sy = (sp?.y ?? cy) + 14
                const nid = `s:${sid}`
                const sn = { id: nid, x: sx, y: sy, type: 'step', taskId: t.id, label }
                nodes.push(sn); nm[nid] = sn
            }
            const sim = forceSimulation(nodes)
                .force('charge', forceManyBody().strength(-60))
                .force('radial', forceRadial(120, cx, cy).strength(0.09))
                .force('collide', forceCollide(36))
                .alpha(0.6)
                .alphaDecay(0.08)
            sim.on('tick', () => {
                const next: Record<string, Pt> = {}
                for (const n of nodes) if (n.type === 'step') next[`${n.taskId}::${n.label}`] = { x: (n.x || 0) - 42, y: (n.y || 0) - 14 }
                if (Object.keys(next).length) setStepPos(prev => ({ ...prev, ...next }))
            })
            simsRef.current[t.id] = sim as any
        }
        nodeMapRef.current = nm
        return () => { for (const id of Object.keys(simsRef.current)) { try { simsRef.current[id].stop() } catch { } } }
    }, [tasks, positions, aiSteps])

    function recenterSteps(taskId: string) {
        setStepPos(prev => {
            const out = { ...prev }
            const t = tasks.find(x => x.id === taskId); if (!t) return prev
            const base = positions[taskId]; if (!base) return prev
            const labels = (aiSteps[taskId]?.length ? aiSteps[taskId] : inferSteps(t).map(s => s.label)) || []
            const n = Math.max(1, labels.length)
            const r = 120
            const node = nodeRefs.current[taskId]
            const w = (node?.offsetWidth ?? 140)
            const h = (node?.offsetHeight ?? 36)
            const cx = base.x + w / 2
            const cy = base.y + h / 2
            labels.forEach((label, i) => {
                const key = `${taskId}::${label}`
                const ang = (i / n) * Math.PI * 2
                out[key] = { x: cx + r * Math.cos(ang) - 42, y: cy + r * Math.sin(ang) - 14 }
            })
            return out
        })
    }

    // Persist and restore step positions
    useEffect(() => {
        try {
            const raw = localStorage.getItem("planner.stepPos")
            if (raw) setStepPos(JSON.parse(raw))
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    useEffect(() => {
        try { localStorage.setItem("planner.stepPos", JSON.stringify(stepPos)) } catch { }
    }, [stepPos])

    const onDown = (e: React.PointerEvent, id: string) => {
        const rect = wrapRef.current?.getBoundingClientRect()
        const localX = rect ? e.clientX - rect.left : e.clientX
        const localY = rect ? e.clientY - rect.top : e.clientY
        const p = positions[id] || { x: 0, y: 0 }
        const screenX = pan.x + p.x * zoom
        const screenY = pan.y + p.y * zoom
        setDrag({ id, off: { x: localX - screenX, y: localY - screenY } })
    }
    const onDownCustom = (e: React.PointerEvent, id: string) => {
        const rect = wrapRef.current?.getBoundingClientRect()
        const localX = rect ? e.clientX - rect.left : e.clientX
        const localY = rect ? e.clientY - rect.top : e.clientY
        const node = customNodes.find(n => n.id === id)!
        const screenX = pan.x + node.x * zoom
        const screenY = pan.y + node.y * zoom
        setDragCustom({ id, off: { x: localX - screenX, y: localY - screenY } })
    }
    const onMove = (e: React.PointerEvent) => {
        const rect = wrapRef.current?.getBoundingClientRect()
        const localX = rect ? e.clientX - rect.left : e.clientX
        const localY = rect ? e.clientY - rect.top : e.clientY
        if (panning.current?.on) {
            const dx = localX - panning.current.start.x
            const dy = localY - panning.current.start.y
            setPan({ x: panning.current.base.x + dx, y: panning.current.base.y + dy })
            return
        }
        if (drag) {
            const screenX = localX - drag.off.x
            const screenY = localY - drag.off.y
            const x = (screenX - pan.x) / zoom
            const y = (screenY - pan.y) / zoom
            setPositions(pos => {
                const prev = pos[drag.id] || { x, y }
                const dx = x - prev.x
                const dy = y - prev.y
                const next = { ...pos, [drag.id]: { x, y } }
                setStepPos(sp => {
                    const nn = { ...sp }
                    const prefix = `${drag.id}::`
                    for (const k of Object.keys(nn)) if (k.startsWith(prefix)) nn[k] = { x: nn[k].x + dx, y: nn[k].y + dy }
                    return nn
                })
                const cnode = nodeMapRef.current[`t:${drag.id}`]
                const refNode = nodeRefs.current[drag.id]
                const w = (refNode?.offsetWidth ?? 140)
                const h = (refNode?.offsetHeight ?? 36)
                if (cnode) {
                    const cx = x + w / 2
                    const cy = y + h / 2
                    cnode.fx = cx; cnode.fy = cy
                    const sim = simsRef.current[drag.id]
                    if (sim) { sim.force('radial', forceRadial(120, cx, cy).strength(0.09)); sim.alphaTarget(0.7).restart() }
                }
                return next
            })
            return
        }
        if (dragStep) {
            const screenX = localX - dragStep.off.x
            const screenY = localY - dragStep.off.y
            const x = (screenX - pan.x) / zoom
            const y = (screenY - pan.y) / zoom
            setStepPos(pos => ({ ...pos, [dragStep.id]: { x, y } }))
            const snode = nodeMapRef.current[`s:${dragStep.id}`]
            const tid = dragStep.id.split('::')[0]
            if (snode) { snode.fx = x + 42; snode.fy = y + 14; const sim = simsRef.current[tid]; sim?.alphaTarget(0.7).restart() }
            return
        }
        if (dragCustom) {
            const screenX = localX - dragCustom.off.x
            const screenY = localY - dragCustom.off.y
            const x = (screenX - pan.x) / zoom
            const y = (screenY - pan.y) / zoom
            setCustomNodes(list => list.map(n => n.id === dragCustom.id ? { ...n, x, y } : n))
            return
        }
    }
    const onUp = (e: React.PointerEvent) => {
        if (drag) setDrag(null)
        if (dragStep) {
            const snode = nodeMapRef.current[`s:${dragStep.id}`]
            const tid = dragStep.id.split('::')[0]
            if (snode) { snode.fx = null; snode.fy = null; const sim = simsRef.current[tid]; sim?.alphaTarget(0) }
            setDragStep(null)
        }
        if (dragCustom) setDragCustom(null)
        panning.current = null
    }

    const onWheel = (e: React.WheelEvent) => {
        // Zoom to cursor and prevent page scroll
        e.preventDefault()
        const rect = wrapRef.current?.getBoundingClientRect()
        const localX = rect ? e.clientX - rect.left : e.clientX
        const localY = rect ? e.clientY - rect.top : e.clientY
        const delta = -e.deltaY
        const step = delta > 0 ? 0.1 : -0.1
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + step))
        if (newZoom === zoom) return
        // Keep point under cursor stable: adjust pan
        const worldX = (localX - pan.x) / zoom
        const worldY = (localY - pan.y) / zoom
        const newPanX = localX - worldX * newZoom
        const newPanY = localY - worldY * newZoom
        setPan({ x: newPanX, y: newPanY })
        setZoom(newZoom)
    }

    const startPan = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('[data-node]')) return
        const rect = wrapRef.current?.getBoundingClientRect()
        const localX = rect ? e.clientX - rect.left : e.clientX
        const localY = rect ? e.clientY - rect.top : e.clientY
        panning.current = { on: true, start: { x: localX, y: localY }, base: { ...pan } }
    }

    const taskIndex = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t])), [tasks])
    const slotsByTask = useMemo(() => {
        const m: Record<string, PlannerSlot[]> = {}
        for (const d of plan?.days || []) for (const s of d.slots) (m[s.taskId] ||= []).push(s)
        return m
    }, [plan])

    return (
        <div ref={wrapRef} className="relative w-full h-full bg-black overflow-hidden"
            onPointerMove={onMove} onPointerUp={onUp} onWheel={onWheel} onWheelCapture={onWheel} onPointerDown={startPan}
            style={{ overscrollBehavior: 'contain', touchAction: 'none' }}>
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #1f2937 1px, transparent 0)`, backgroundSize: `24px 24px`, zIndex: 0 }} />
            <div className="pointer-events-none absolute inset-0" style={{
                zIndex: 1,
                opacity: 0.7,
                mixBlendMode: 'screen' as any,
                backgroundImage: [
                    `radial-gradient(900px 500px at 18% 8%, rgba(56,189,248,0.10), rgba(56,189,248,0) 60%)`,
                    `radial-gradient(700px 420px at 82% 28%, rgba(147,51,234,0.09), rgba(147,51,234,0) 60%)`,
                    `radial-gradient(800px 600px at 50% 88%, rgba(34,197,94,0.08), rgba(34,197,94,0) 60%)`,
                    `radial-gradient(1200px 800px at 50% 50%, rgba(255,255,255,0.06), rgba(0,0,0,0) 70%)`
                ].join(', ')
            }} />
            <div className="absolute top-3 left-3 z-20 text-[11px] text-stone-400 bg-stone-900/60 border border-zinc-800 rounded px-2 py-1 backdrop-blur">
                Drag to pan, scroll to zoom, drag nodes to arrange. Double-click a node to focus.
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {tasks.map(t => {
                    const p = positions[t.id]; if (!p) return null
                    const node = nodeRefs.current[t.id]
                    const w = Math.max(1, (node?.offsetWidth ?? 140))
                    const h = Math.max(1, (node?.offsetHeight ?? 36))
                    const cxWorld = p.x + w / 2
                    const cyWorld = p.y + h / 2
                    const rxC = w / 2
                    const ryC = h / 2
                    const labels = aiSteps[t.id]?.length ? aiSteps[t.id]! : inferSteps(t).map(s => s.label)
                    return (
                        <g key={t.id}>
                            {labels.map(label => {
                                const sid = `${t.id}::${label}`
                                const sp = stepPos[sid]; if (!sp) return null
                                const sxWorld = sp.x + 42
                                const syWorld = sp.y + 14
                                const { ax: axWorld, ay: ayWorld, bx: bxWorld, by: byWorld } = anchorLine(cxWorld, cyWorld, rxC, ryC, sxWorld, syWorld)
                                const x1 = pan.x + axWorld * zoom
                                const y1 = pan.y + ayWorld * zoom
                                const x2 = pan.x + bxWorld * zoom
                                const y2 = pan.y + byWorld * zoom
                                return <line key={sid} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#27272a" strokeWidth={1.5} />
                            })}
                        </g>
                    )
                })}
            </svg>
            {tasks.length === 0 && customNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="520" height="280" viewBox="0 0 700 380" className="opacity-60">
                        <defs>
                            <radialGradient id="pulse1" cx="50%" cy="50%">
                                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
                                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="pulse2" cx="50%" cy="50%">
                                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                            </radialGradient>
                            <radialGradient id="pulse3" cx="50%" cy="50%">
                                <stop offset="0%" stopColor="#4ade80" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                            </radialGradient>
                            <style>
                                {`@keyframes twinkle { 0%, 100% { opacity: .2 } 50% { opacity: 1 } }
                  .tw { animation: twinkle 3.0s ease-in-out infinite; }
                  .tw2 { animation: twinkle 3.8s ease-in-out infinite; }
                  .tw3 { animation: twinkle 4.6s ease-in-out infinite; }`}
                            </style>
                        </defs>
                        <g>
                            <circle cx="350" cy="190" r="5" fill="#93c5fd" className="tw" />
                            <circle cx="520" cy="120" r="3" fill="#fca5a5" className="tw2" />
                            <circle cx="210" cy="90" r="2.5" fill="#86efac" className="tw3" />
                            <circle cx="140" cy="250" r="3" fill="#a78bfa" className="tw2" />
                            <circle cx="580" cy="250" r="2.5" fill="#67e8f9" className="tw" />
                            <g stroke="#3f3f46" strokeWidth="1">
                                <line x1="350" y1="190" x2="520" y2="120" />
                                <line x1="350" y1="190" x2="210" y2="90" />
                                <line x1="350" y1="190" x2="140" y2="250" />
                                <line x1="350" y1="190" x2="580" y2="250" />
                                <line x1="520" y1="120" x2="580" y2="250" />
                                <line x1="210" y1="90" x2="140" y2="250" />
                            </g>
                            <g fontFamily="Inter, ui-sans-serif" fontSize="12" fill="#e4e4e7" textAnchor="middle">
                                <rect x="325" y="172" width="54" height="24" rx="7" fill="#18181b" stroke="#27272a" />
                                <text x="352" y="189">Focus</text>
                                <rect x="495" y="104" width="54" height="22" rx="7" fill="#111827" stroke="#1f2937" />
                                <text x="522" y="119">Recall</text>
                                <rect x="185" y="74" width="54" height="22" rx="7" fill="#0f172a" stroke="#1f2937" />
                                <text x="212" y="89">Outline</text>
                                <rect x="115" y="234" width="54" height="22" rx="7" fill="#111827" stroke="#1f2937" />
                                <text x="142" y="249">Review</text>
                                <rect x="555" y="234" width="54" height="22" rx="7" fill="#0f172a" stroke="#1f2937" />
                                <text x="582" y="249">Refine</text>
                            </g>
                            <g opacity="0.35">
                                <circle cx="350" cy="190" r="28" fill="url(#pulse1)" />
                                <circle cx="520" cy="120" r="22" fill="url(#pulse2)" />
                                <circle cx="140" cy="250" r="22" fill="url(#pulse2)" />
                                <circle cx="210" cy="90" r="18" fill="url(#pulse3)" />
                                <circle cx="580" cy="250" r="18" fill="url(#pulse1)" />
                            </g>
                        </g>
                    </svg>
                </div>
            )}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {(() => {
                    const edges = new Map<string, { ax: number; ay: number; bx: number; by: number }>()
                    for (const a of customNodes) {
                        const neigh = customNodes
                            .filter(n => n.id !== a.id)
                            .map(n => ({ n, d: (n.x - a.x) ** 2 + (n.y - a.y) ** 2 }))
                            .sort((x, y) => x.d - y.d)
                            .slice(0, 2)
                        for (const { n: b } of neigh) {
                            const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
                            if (!edges.has(key)) {
                                const ax = pan.x + a.x * zoom
                                const ay = pan.y + a.y * zoom
                                const bx = pan.x + b.x * zoom
                                const by = pan.y + b.y * zoom
                                edges.set(key, { ax, ay, bx, by })
                            }
                        }
                    }
                    return Array.from(edges.values()).map((e, i) => (
                        <line key={i} x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by} stroke="#3f3f46" strokeWidth={1} />
                    ))
                })()}
            </svg>

            {tasks.map(t => {
                const p = positions[t.id]; if (!p) return null
                const labels = aiSteps[t.id]?.length ? aiSteps[t.id]! : inferSteps(t).map(s => s.label)
                const counts = stepCountsFor(t, labels.map(l => ({ label: l, w: 1 })))
                return (
                    <div key={t.id} className="absolute select-none" data-node style={{ left: pan.x + p.x * zoom, top: pan.y + p.y * zoom }}>
                        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'relative' }}>
                            <div ref={el => { nodeRefs.current[t.id] = el }}
                                onDoubleClick={() => {
                                    const rect = wrapRef.current?.getBoundingClientRect()
                                    const cx = rect ? rect.width / 2 : 0
                                    const cy = rect ? rect.height / 2 : 0
                                    const node = nodeRefs.current[t.id]
                                    const w = (node?.offsetWidth ?? 140)
                                    const h = (node?.offsetHeight ?? 36)
                                    const worldX = positions[t.id].x + w / 2
                                    const worldY = positions[t.id].y + h / 2
                                    const newZoom = Math.min(MAX_ZOOM, Math.max(zoom, 1.5))
                                    const newPanX = cx - worldX * newZoom
                                    const newPanY = cy - worldY * newZoom
                                    setPan({ x: newPanX, y: newPanY })
                                    setZoom(newZoom)
                                }}>
                                <div className="pointer-events-none absolute -inset-2 opacity-35" style={{ background: `radial-gradient(22px 22px at 50% 65%, rgba(56,189,248,0.2), transparent 70%)` }} />
                                <div onPointerDown={e => onDown(e, t.id)} className="cursor-grab active:cursor-grabbing rounded-full border bg-[#0b1220]/70 border-[#1f2937] pl-3 pr-1.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur flex items-center gap-1.5">
                                    <div className="text-[12px] text-slate-200 whitespace-nowrap max-w-[260px] truncate">{t.title}</div>
                                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === t.id ? null : t.id) }} className="text-[12px] text-slate-300 hover:text-slate-100 px-1 rounded hover:bg-stone-800">⋯</button>
                                </div>
                                {menuOpen === t.id && (
                                    <div className="absolute left-0 top-[120%] z-30 bg-stone-900/95 border border-zinc-800 rounded-md shadow-lg min-w-[160px] p-1">
                                        <button onClick={() => { setMenuOpen(null); onUpdateStatus(t.id, 'doing'); onPlan(t.id); }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Start now</button>
                                        <button onClick={() => { setMenuOpen(null); onPlan(t.id) }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Plan</button>
                                        <div className="border-t border-zinc-800 my-1" />
                                        <button onClick={() => { setMenuOpen(null); onAssist(t.id, 'summary') }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Assist: Summary</button>
                                        <button onClick={() => { setMenuOpen(null); onAssist(t.id, 'studyGuide') }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Assist: Study Guide</button>
                                        <button onClick={() => { setMenuOpen(null); onAssist(t.id, 'flashcards') }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Assist: Flashcards</button>
                                        <div className="border-t border-zinc-800 my-1" />
                                        <label className="block text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800 cursor-pointer">
                                            Upload file
                                            <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(t.id, f); setMenuOpen(null) }} />
                                        </label>
                                        <button onClick={() => { const val = window.prompt('Add note'); if (val != null) { onUpdateNotes?.(t.id, val) } setMenuOpen(null) }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Add note…</button>
                                        <button onClick={() => { recenterSteps(t.id); setMenuOpen(null) }} className="w-full text-left text-[12px] text-stone-200 px-2 py-1 rounded hover:bg-stone-800">Recenter steps</button>
                                        <div className="border-t border-zinc-800 my-1" />
                                        <button onClick={() => { setMenuOpen(null); onDelete(t.id) }} className="w-full text-left text-[12px] text-red-400 px-2 py-1 rounded hover:bg-red-950/40">Delete task</button>
                                    </div>
                                )}
                            </div>
                            {labels.map((label) => {
                                const sid = `${t.id}::${label}`
                                const sp = stepPos[sid]
                                if (!sp) return null
                                const cnt = counts[label] || 0
                                const glow = 'radial-gradient(18px 18px at 50% 60%, rgba(125,211,252,0.12), rgba(0,0,0,0) 70%)'
                                const relX = sp.x - p.x
                                const relY = sp.y - p.y
                                return (
                                    <div key={sid} className="absolute rounded-full border border-zinc-800 bg-stone-950/80 text-center text-stone-300 cursor-grab active:cursor-grabbing"
                                        onPointerDown={e => {
                                            const rect = wrapRef.current?.getBoundingClientRect()
                                            const localX = rect ? e.clientX - rect.left : e.clientX
                                            const localY = rect ? e.clientY - rect.top : e.clientY
                                            const screenX = pan.x + sp.x * zoom
                                            const screenY = pan.y + sp.y * zoom
                                            setDragStep({ id: sid, off: { x: localX - screenX, y: localY - screenY } })
                                        }}
                                        style={{ 
                                            left: relX, 
                                            top: relY, 
                                            width: 84, 
                                            height: 28, 
                                            lineHeight: '28px', 
                                            fontSize: '11px'
                                        }}>
                                        <div className="pointer-events-none absolute -inset-2" style={{ background: glow }} />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setAiSteps(s => {
                                                    const labels = (s[t.id] && Array.isArray(s[t.id])) ? s[t.id].slice() : (aiSteps[t.id]?.slice() || inferSteps(t).map(x => x.label))
                                                    const nextLabels = labels.filter(l => l !== label)
                                                    const next = { ...s, [t.id]: nextLabels }
                                                    try { localStorage.setItem(`planner.aiSteps.${t.id}`, JSON.stringify(nextLabels)) } catch { }
                                                    return next
                                                })
                                                setStepPos(sp => {
                                                    const nn = { ...sp }; delete nn[sid]; return nn
                                                })
                                            }}
                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-800 text-stone-100 hover:bg-red-600 hover:text-white flex items-center justify-center z-20"
                                            aria-label="Delete bubble"
                                        >×</button>
                                        <span className="relative px-2">{label}{cnt ? ` (${cnt})` : ''}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}

            {customNodes.map(n => (
                <div key={n.id} className="absolute select-none" data-node
                    style={{ left: pan.x + n.x * zoom, top: pan.y + n.y * zoom }}>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'relative' }}>
                        <div className="pointer-events-none absolute -inset-2 opacity-35" style={{
                            background: `radial-gradient(22px 22px at 50% 65%, ${n.color}33, transparent 70%)`
                        }} />
                        <div
                            onPointerDown={(e) => onDownCustom(e, n.id)}
                            className="cursor-grab active:cursor-grabbing rounded-lg border bg-[#0b1220]/70 border-[#1f2937] px-2.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur"
                        >
                            <div className="flex items-center gap-2">
                                {editingId === n.id ? (
                                    <input autoFocus defaultValue={n.label} onBlur={(e) => { setCustomNodes(list => list.map(x => x.id === n.id ? { ...x, label: e.target.value } : x)); setEditingId(null) }}
                                        className="bg-transparent text-[12px] text-slate-200 outline-none" />
                                ) : (
                                    <div className="text-[12px] text-slate-200" onDoubleClick={() => setEditingId(n.id)}>{n.label}</div>
                                )}
                                <button onClick={() => setCustomNodes(list => list.filter(x => x.id !== n.id))}
                                    className="text-[11px] text-slate-400 hover:text-slate-200">×</button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <div className="absolute top-3 right-3 z-20 bg-stone-900/70 backdrop-blur border border-zinc-800 rounded-lg px-2 py-1 flex items-center gap-2 text-xs text-stone-300">
                <button onClick={() => {
                    const rect = wrapRef.current?.getBoundingClientRect()
                    const cx = rect ? rect.width / 2 : 300
                    const cy = rect ? rect.height / 2 : 200
                    const worldX = (cx - pan.x) / zoom
                    const worldY = (cy - pan.y) / zoom
                    const colors = ['#22d3ee', '#a78bfa', '#4ade80', '#f472b6', '#f59e0b']
                    const color = colors[Math.floor(Math.random() * colors.length)]
                    const id = Math.random().toString(36).slice(2, 9)
                    setCustomNodes(list => [...list, { id, x: worldX, y: worldY, label: 'Idea', color }])
                    setEditingId(id)
                }} className="px-2 py-1 bg-stone-800 rounded">Add bubble</button>
                <button onClick={() => {
                    const rect = wrapRef.current?.getBoundingClientRect()
                    const cx = rect ? rect.width / 2 : 0
                    const cy = rect ? rect.height / 2 : 0
                    const newZoom = Math.max(MIN_ZOOM, zoom - 0.1)
                    const worldX = (cx - pan.x) / zoom
                    const worldY = (cy - pan.y) / zoom
                    setPan({ x: cx - worldX * newZoom, y: cy - worldY * newZoom })
                    setZoom(newZoom)
                }} className="px-2 py-1 bg-stone-800 rounded">-</button>
                <div className="px-2">{Math.round(zoom * 100)}%</div>
                <button onClick={() => {
                    const rect = wrapRef.current?.getBoundingClientRect()
                    const cx = rect ? rect.width / 2 : 0
                    const cy = rect ? rect.height / 2 : 0
                    const newZoom = Math.min(MAX_ZOOM, zoom + 0.1)
                    const worldX = (cx - pan.x) / zoom
                    const worldY = (cy - pan.y) / zoom
                    setPan({ x: cx - worldX * newZoom, y: cy - worldY * newZoom })
                    setZoom(newZoom)
                }} className="px-2 py-1 bg-stone-800 rounded">+</button>
                <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1.25) }} className="px-2 py-1 bg-stone-800 rounded">Reset</button>
            </div>
        </div>
    )
}
