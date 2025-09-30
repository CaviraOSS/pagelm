import db from "../../utils/database/keyv"
import crypto from "crypto"
import { Task } from "./types"

const LIST_KEY = "planner:tasks"

export async function createTask(t: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
    const id = crypto.randomUUID()
    const now = Date.now()
    const task: Task = { ...t, id, createdAt: now, updatedAt: now }
    const list = (await db.get(LIST_KEY)) || []
    list.push({ id })
    await db.set(LIST_KEY, list)
    await db.set(`planner:task:${id}`, task)
    return task
}

export async function getTask(id: string): Promise<Task | null> {
    return (await db.get(`planner:task:${id}`)) || null
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task | null> {
    const cur = (await getTask(id))
    if (!cur) return null
    const next: Task = { ...cur, ...patch, id: cur.id, updatedAt: Date.now() }
    await db.set(`planner:task:${id}`, next)
    return next
}

export async function deleteTask(id: string): Promise<boolean> {
    const list = ((await db.get(LIST_KEY)) || []).filter((x: any) => x.id !== id)
    await db.set(LIST_KEY, list)
    await db.delete(`planner:task:${id}`)
    return true
}

export async function listTasks(filter?: { status?: string; dueBefore?: number; course?: string }): Promise<Task[]> {
    const list = (await db.get(LIST_KEY)) || []
    const tasks: Task[] = []
    for (const it of list) {
        const t = await getTask(it.id)
        if (!t) continue
        if (filter?.status && t.status !== filter.status) continue
        if (filter?.dueBefore && t.dueAt > filter.dueBefore) continue
        if (filter?.course && t.course !== filter.course) continue
        tasks.push(t)
    }
    return tasks.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0))
}
