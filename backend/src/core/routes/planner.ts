import { ingestText } from "../../services/planner/ingest"
import { plannerService } from "../../services/planner/service"
import { CreateTaskRequest, UpdateTaskRequest, PlannerGenerateRequest, MaterialsRequest } from "../../services/planner/types"
import { emitToAll } from "../../utils/chat/ws"
import { emitLarge } from "../../utils/chat/ws"
import { parseMultipart } from "../../lib/parser/upload"
import crypto from "crypto"

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

    app.post("/tasks", async (req: any, res: any) => {
        try {
            const ct = req.headers['content-type'] || ''
            const isMultipart = ct.includes("multipart/form-data")

            if (isMultipart) {
                const { q: text, files } = await parseMultipart(req)
                const request: CreateTaskRequest = { text, files }
                const task = await plannerService.createTaskFromRequest(request)
                res.send({ ok: true, task })
                emitToAll(rooms.get("default"), { type: "task.created", task })
            } else {
                const request: CreateTaskRequest = req.body
                const task = await plannerService.createTaskFromRequest(request)
                res.send({ ok: true, task })
                emitToAll(rooms.get("default"), { type: "task.created", task })
            }
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/ingest", async (req: any, res: any) => {
        try {
            const text = String(req.body?.text || "").trim()
            if (!text) return res.status(400).send({ ok: false, error: "text required" })
            const task = await plannerService.createTaskFromRequest({ text })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "task.created", task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/tasks/:id", async (req: any, res: any) => {
        try {
            const task = await plannerService.getTask(req.params.id)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true, task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/replan", async (req: any, res: any) => {
        try {
            const task = await plannerService.replanTask(req.params.id)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "plan.update", taskId: task.id, slots: task.plan?.slots || [] })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/plan", async (req: any, res: any) => {
        try {
            console.log('Planning task:', req.params.id)
            const task = await plannerService.planSingleTask(req.params.id)
            if (!task) {
                console.log('Task not found:', req.params.id)
                return res.status(404).send({ ok: false, error: "Task not found" })
            }

            console.log('Task planned successfully:', task.id, 'Steps:', task.steps?.length)
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "plan.update", taskId: task.id, slots: task.plan?.slots || [] })
        } catch (e: any) {
            console.error('Plan task error:', e)
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/planner/weekly", async (req: any, res: any) => {
        try {
            const request: PlannerGenerateRequest = req.body
            const result = await plannerService.generateWeeklyPlan(request)
            res.send({ ok: true, ...result })
            emitToAll(rooms.get("default"), { type: "weekly.update", plan: result.plan })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/planner/today", async (req: any, res: any) => {
        try {
            const sessions = await plannerService.getTodaySessions()
            res.send({ ok: true, sessions })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/planner/deadlines", async (req: any, res: any) => {
        try {
            const deadlines = await plannerService.getUpcomingDeadlines()
            res.send({ ok: true, ...deadlines })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/planner/stats", async (req: any, res: any) => {
        try {
            const stats = await plannerService.getUserStats()
            res.send({ ok: true, stats })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/materials", async (req: any, res: any) => {
        try {
            const id = req.params.id
            const request: MaterialsRequest = { type: req.body?.type || "summary" }
            emitToAll(rooms.get("default"), { type: "phase", value: "assist" })
            const materials = await plannerService.generateMaterials(id, request)
            await emitLarge(rooms.get("default"), "materials", { taskId: id, type: request.type, data: materials }, { gzip: true })
            emitToAll(rooms.get("default"), { type: "done", taskId: id })
            res.send({ ok: true, materials })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.patch("/slots/:taskId/:slotId", async (req: any, res: any) => {
        try {
            const { taskId, slotId } = req.params
            const { done, skip } = req.body
            const task = await plannerService.updateSlot(taskId, slotId, { done, skip })
            if (!task) return res.status(404).send({ ok: false, error: "Task or slot not found" })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "slot.update", taskId, slotId, done, skip })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.get("/tasks", async (req: any, res: any) => {
        try {
            const { status, dueBefore, course } = req.query
            const filter: any = {}
            if (status) filter.status = status as string
            if (dueBefore) filter.dueBefore = dueBefore as string
            if (course) filter.course = course as string

            const tasks = await plannerService.listTasks(filter)
            res.send({ ok: true, tasks })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.patch("/tasks/:id", async (req: any, res: any) => {
        try {
            const updates: UpdateTaskRequest = req.body
            const task = await plannerService.updateTask(req.params.id, updates)
            if (!task) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true, task })
            emitToAll(rooms.get("default"), { type: "task.updated", task })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.delete("/tasks/:id", async (req: any, res: any) => {
        try {
            const success = await plannerService.deleteTask(req.params.id)
            if (!success) return res.status(404).send({ ok: false, error: "Task not found" })
            res.send({ ok: true })
            emitToAll(rooms.get("default"), { type: "task.deleted", taskId: req.params.id })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/tasks/:id/files", async (req: any, res: any) => {
        try {
            const ct = req.headers['content-type'] || ''
            if (!ct.includes("multipart/form-data")) {
                return res.status(400).send({ ok: false, error: "multipart/form-data required" })
            }

            const { files } = await parseMultipart(req)
            if (!files || files.length === 0) {
                return res.status(400).send({ ok: false, error: "no files uploaded" })
            }

            const taskId = req.params.id
            const uploadedFiles = await plannerService.addFilesToTask(taskId, files)
            res.send({ ok: true, files: uploadedFiles })
            emitToAll(rooms.get("default"), { type: "task.files.added", taskId, files: uploadedFiles })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.delete("/tasks/:id/files/:fileId", async (req: any, res: any) => {
        try {
            const success = await plannerService.removeFileFromTask(req.params.id, req.params.fileId)
            if (!success) return res.status(404).send({ ok: false, error: "File not found" })
            res.send({ ok: true })
            emitToAll(rooms.get("default"), { type: "task.file.removed", taskId: req.params.id, fileId: req.params.fileId })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/sessions/start", async (req: any, res: any) => {
        try {
            const { taskId, slotId } = req.body
            if (!taskId) return res.status(400).send({ ok: false, error: "taskId required" })

            const session = {
                id: crypto.randomUUID(),
                taskId,
                slotId,
                startedAt: new Date().toISOString(),
                status: 'active'
            }

            res.send({ ok: true, session })
            emitToAll(rooms.get("default"), { type: "session.started", session })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/sessions/:id/stop", async (req: any, res: any) => {
        try {
            const sessionId = req.params.id
            const { minutesWorked, completed } = req.body

            const session = {
                id: sessionId,
                endedAt: new Date().toISOString(),
                minutesWorked: minutesWorked || 0,
                completed: completed || false,
                status: 'completed'
            }

            res.send({ ok: true, session })
            emitToAll(rooms.get("default"), { type: "session.ended", session })
        } catch (e: any) {
            res.status(500).send({ ok: false, error: e?.message || "failed" })
        }
    })

    app.post("/reminders/schedule", async (req: any, res: any) => {
        try {
            const { text, scheduledFor, taskId } = req.body
            if (!text || !scheduledFor) {
                return res.status(400).send({ ok: false, error: "text and scheduledFor required" })
            }

            const reminder = {
                id: crypto.randomUUID(),
                text,
                taskId,
                scheduledFor,
                createdAt: new Date().toISOString()
            }

            res.send({ ok: true, reminder })

            const delayMs = new Date(scheduledFor).getTime() - Date.now()
            if (delayMs > 0) {
                setTimeout(() => {
                    emitToAll(rooms.get("default"), {
                        type: "reminder",
                        id: reminder.id,
                        text: reminder.text,
                        taskId: reminder.taskId,
                        scheduledFor: reminder.scheduledFor
                    })
                }, delayMs)
            }
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
let lastBreakReminder = 0

setInterval(async () => {
    try {
        const now = new Date()
        const hh = now.getHours()
        const mm = now.getMinutes()
        const today = now.toISOString().slice(0, 10)

        if (hh === 8 && mm < 5 && lastDigest !== today) {
            lastDigest = today
            const tomorrow = new Date(today + "T23:59:59Z").toISOString()
            const tasks = await plannerService.listTasks({ dueBefore: tomorrow })
            const dueToday = tasks.filter(t => new Date(t.dueAt).toDateString() === new Date(today).toDateString())
            const todaySessions = await plannerService.getTodaySessions()

            emitToAll(rooms.get("default"), {
                type: "daily.digest",
                date: today,
                due: dueToday.map(t => ({ id: t.id, title: t.title, dueAt: t.dueAt })),
                sessions: todaySessions.length,
                message: `Good morning! You have ${dueToday.length} tasks due today and ${todaySessions.length} sessions planned.`
            })
        }

        if (hh >= 9 && hh <= 18 && mm < 5) {
            const currentHour = now.getTime()
            if (currentHour - lastBreakReminder > 2 * 60 * 60 * 1000) {
                lastBreakReminder = currentHour
                emitToAll(rooms.get("default"), {
                    type: "break.reminder",
                    text: "Time for a break! Consider taking 5-10 minutes to rest your eyes and stretch.",
                    at: now.toISOString()
                })
            }
        }

        // Evening review at 8 PM
        if (hh === 20 && mm < 5) {
            const stats = await plannerService.getUserStats()
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
            const tomorrowTasks = await plannerService.listTasks({
                status: 'todo',
                dueBefore: new Date(tomorrow + "T23:59:59Z").toISOString()
            })

            emitToAll(rooms.get("default"), {
                type: "evening.review",
                date: today,
                stats,
                tomorrowTasks: tomorrowTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title })),
                message: `Today's recap: ${stats.completedTasks} tasks completed. Tomorrow you have ${tomorrowTasks.length} tasks planned.`
            })
        }
    } catch { }
}, 60000)
