export type TaskStatus = "todo" | "doing" | "done" | "blocked"

export type PlanPolicy = {
    pomodoroMins: number
    breakMins: number
    maxPerDayMins?: number
    cram?: boolean
}

export type SlotKind = "focus" | "review" | "buffer"

export type Slot = {
    id: string
    taskId: string
    start: number
    end: number
    kind: SlotKind
    done?: boolean
}

export type TaskSource = { kind: "text" | "pdf" | "url" | "voice"; ref?: string; page?: number }

export type TaskMetrics = { sessions: number; minutesSpent: number; quizAvg?: number }

export type TaskPlan = { slots: Slot[]; policy: PlanPolicy; lastPlannedAt: number }

export type Task = {
    id: string
    course?: string
    title: string
    type?: string
    notes?: string
    dueAt: number
    estMins: number
    priority: 1 | 2 | 3 | 4 | 5
    status: TaskStatus
    createdAt: number
    updatedAt: number
    source?: TaskSource
    plan?: TaskPlan
    metrics?: TaskMetrics
    tags?: string[]
    rubric?: string
}

export type WeeklyPlan = { days: { date: string; slots: Slot[] }[] }
