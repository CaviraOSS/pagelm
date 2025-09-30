import { ingestText } from "../../services/planner/ingest"
import { createTask, deleteTask, getTask, listTasks, updateTask } from "../../services/planner/store"
import { defaultPolicy, planTask, weeklyPlan } from "../../services/planner/scheduler"
import { generateMaterials } from "../../services/planner/materials"
import { emitToAll } from "../../utils/chat/ws"
import { emitLarge } from "../../utils/chat/ws"

const rooms = new Map<string, Set<any>>()
const log = (...a: any[]) => console.log("[planner]", ...a)

export function plannerRoutes(app: any) {
    app.ws("/ws/planner", (ws: any, req: any) => {
        const u = new URL(req.url, "http://localhost")
        const sid = u.searchParams.get("sid") || "default"
        let set = rooms.get(sid)
        if (!set) { set = new Set(); rooms.set(sid, set) }
        set.add(ws)
        ws.send(JSON.stringify({ type: "ready", sid }))
        ws.on("close", () => { set!.delete(ws); if (set!.size === 0) rooms.delete(sid) })
    })

    app.post("/tasks/ingest", async (req: any, res: any) => {
        try {
            const text = String(req.body?.text || "").trim()
            if (!text) return res.status(400).send({ ok: false, error: "text required" })
            const base = ingestText(text)
            const created = await createTask(base)
            res.send({ ok: true, task: created })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/plan", async (req: any, res: any) => {
        try {
            const id = req.params.id
            const t = await getTask(id)
            if (!t) return res.status(404).send({ ok: false, error: "not found" })
            const planned = planTask(t, defaultPolicy(Boolean(req.body?.cram)))
            await updateTask(id, planned)
            res.send({ ok: true, task: planned })
            emitToAll(rooms.get("default"), { type: "plan.update", taskId: id, slots: planned.plan?.slots || [] })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/planner/weekly", async (req: any, res: any) => {
        try {
            const tasks = await listTasks()
            const plan = weeklyPlan(tasks, defaultPolicy(Boolean(req.body?.cram)))
            res.send({ ok: true, plan })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/materials", async (req: any, res: any) => {
        try {
            const id = req.params.id
            const kind = String(req.body?.kind || "summary") as any
            const t = await getTask(id)
            if (!t) return res.status(404).send({ ok: false, error: "not found" })
            emitToAll(rooms.get("default"), { type: "phase", value: "assist" })
            const out = await generateMaterials(t.title, kind)
            await emitLarge(rooms.get("default"), "materials", { taskId: id, kind, data: out }, { gzip: true })
            emitToAll(rooms.get("default"), { type: "done", taskId: id })
            res.send({ ok: true, data: out })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/tasks", async (req: any, res: any) => {
        try {
            const status = req.query.status
            const dueBefore = req.query.dueBefore ? Number(req.query.dueBefore) : undefined
            const course = req.query.course
            const tasks = await listTasks({ status, dueBefore, course })
            res.send({ ok: true, tasks })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.patch("/tasks/:id", async (req: any, res: any) => {
        try {
            const id = req.params.id
            const t = await updateTask(id, req.body || {})
            if (!t) return res.status(404).send({ ok: false, error: "not found" })
            res.send({ ok: true, task: t })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.delete("/tasks/:id", async (req: any, res: any) => {
        try {
            const id = req.params.id
            await deleteTask(id)
            res.send({ ok: true })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/reminders/test", async (_req: any, res: any) => {
        emitToAll(rooms.get("default"), { type: "reminder", text: "Test reminder", at: Date.now() + 60000 })
        res.send({ ok: true })
    })
}

let lastDigest = ""
setInterval(async () => {
    try {
        const now = new Date()
        const hh = now.getHours()
        const mm = now.getMinutes()
        const today = now.toISOString().slice(0, 10)
        if (hh === 8 && mm < 5 && lastDigest !== today) {
            lastDigest = today
            const start = new Date(today + "T00:00:00Z").getTime()
            const end = start + 24 * 3600 * 1000
            const tasks = await listTasks()
            const dueToday = tasks.filter(t => t.dueAt >= start && t.dueAt < end)
            emitToAll(rooms.get("default"), { type: "daily.digest", date: today, due: dueToday.map(t => ({ id: t.id, title: t.title, dueAt: t.dueAt })) })
        }
    } catch { }
}, 60000)
