import { PlanPolicy, Slot, Task, WeeklyPlan } from "./types"
import { makeSlots, calculateUrgencyScore } from "./ai"

const DAY_MS = 24 * 3600 * 1000

export function defaultPolicy(cram = false): PlanPolicy {
    return { pomodoroMins: 25, breakMins: 5, maxDailyMins: cram ? 360 : 240, cram }
}

export function planTask(task: Task, policy: PlanPolicy): Task {
    const slots = makeSlots([task], policy)
    const taskSlots = slots.filter(s => s.taskId === task.id)

    const plan = {
        slots: taskSlots,
        policy,
        lastPlannedAt: new Date().toISOString()
    }

    return { ...task, plan }
}

export function planTasks(tasks: Task[], policy: PlanPolicy): Task[] {
    const allSlots = makeSlots(tasks, policy)

    return tasks.map(task => {
        const taskSlots = allSlots.filter(s => s.taskId === task.id)
        const plan = {
            slots: taskSlots,
            policy,
            lastPlannedAt: new Date().toISOString()
        }
        return { ...task, plan }
    })
}

export function weeklyPlan(tasks: Task[], policy: PlanPolicy): WeeklyPlan {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const days = [] as { date: string; slots: Slot[] }[]

    for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * DAY_MS)
        days.push({ date: d.toISOString().slice(0, 10), slots: [] })
    }

    for (const task of tasks) {
        const taskSlots = task.plan?.slots || []
        for (const slot of taskSlots) {
            const slotDate = new Date(slot.start)
            const dayIndex = Math.floor((slotDate.getTime() - start.getTime()) / DAY_MS)
            if (dayIndex >= 0 && dayIndex < 7) {
                days[dayIndex].slots.push(slot)
            }
        }
    }

    for (const day of days) {
        day.slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    }

    return { days }
}