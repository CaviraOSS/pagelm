import { Task, TaskType, Slot, PlanPolicy } from "./types"
import { handleAsk } from "../../lib/ai/ask"

export async function parseTask(text: string): Promise<Partial<Task>> {
    const systemPrompt = `Parse this homework/assignment text into structured data. Extract key information like title, due date, estimated time, course, and type. Respond with simple key-value pairs, one per line.

Format your response as:
title: [task title]
course: [course name if mentioned]  
type: [homework/project/lab/essay/exam]
dueAt: [ISO date string]
estMins: [estimated minutes as number]
priority: [1-5 priority]
notes: [any additional details]

Current date: ${new Date().toISOString()}

Example input: "Calc HW 5 due Fri 5pm ~2h; ch 6-7"
Example output:
title: Calc HW 5
course: Calc
type: homework
dueAt: 2025-10-11T17:00:00.000Z
estMins: 120
priority: 3
notes: chapters 6-7`

    try {
        const response = await handleAsk(systemPrompt + '\n\nText to parse: ' + text)
        const parsed = parseKeyValueResponse(response.answer)
        const fallback = heuristicParse(text)

        return {
            title: parsed.title || fallback.title,
            dueAt: parsed.dueAt || fallback.dueAt,
            estMins: parsed.estMins ? parseInt(parsed.estMins) : fallback.estMins,
            course: parsed.course || fallback.course,
            type: parsed.type as TaskType || fallback.type,
            priority: parsed.priority ? parseInt(parsed.priority) as 1 | 2 | 3 | 4 | 5 : fallback.priority,
            notes: parsed.notes || fallback.notes
        }
    } catch (error) {
        console.warn('LLM parsing failed, using heuristics:', error)
        return heuristicParse(text)
    }
}

function parseKeyValueResponse(text: string): Record<string, string> {
    const result: Record<string, string> = {}
    const lines = text.split('\n')

    for (const line of lines) {
        const match = line.match(/^([a-zA-Z]+)\s*:\s*(.+)$/)
        if (match) {
            const [, key, value] = match
            result[key.trim()] = value.trim()
        }
    }

    return result
}

function heuristicParse(text: string): Partial<Task> {
    const result: Partial<Task> = {
        title: text.trim(),
        priority: 3,
        estMins: 60,
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Default to 1 week from now
    }

    const datePatterns = [
        /due\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /due\s+(mon|tue|wed|thu|fri|sat|sun)/i,
        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /(mon|tue|wed|thu|fri|sat|sun)/i,
        /due\s+(tomorrow|today)/i,
        /(tomorrow|today)/i,
        /due\s+(\d{1,2}\/\d{1,2})/,
        /due\s+(\d{1,2}-\d{1,2})/,
        /(next\s+week)/i,
        /(this\s+week)/i,
    ]

    for (const pattern of datePatterns) {
        const match = text.match(pattern)
        if (match) {
            result.dueAt = parseDateHeuristic(match[1])
            break
        }
    }

    const timePatterns = [
        /~(\d+)h/i,
        /~(\d+)\s*hours?/i,
        /(\d+)m/i,
        /(\d+)\s*mins?/i,
    ]

    for (const pattern of timePatterns) {
        const match = text.match(pattern)
        if (match) {
            const num = parseInt(match[1])
            result.estMins = pattern.source.includes('h') ? num * 60 : num
            break
        }
    }

    const courseMatch = text.match(/^([A-Za-z]+)\s/)
    if (courseMatch) {
        result.course = courseMatch[1]
    }

    if (text.toLowerCase().includes('hw') || text.toLowerCase().includes('homework')) {
        result.type = 'homework' as TaskType
    } else if (text.toLowerCase().includes('essay') || text.toLowerCase().includes('paper')) {
        result.type = 'essay' as TaskType
    } else if (text.toLowerCase().includes('project')) {
        result.type = 'project' as TaskType
    } else if (text.toLowerCase().includes('lab')) {
        result.type = 'lab' as TaskType
    } else if (text.toLowerCase().includes('exam') || text.toLowerCase().includes('test')) {
        result.type = 'exam' as TaskType
    }

    if (result.dueAt) {
        const timeToDeadline = new Date(result.dueAt).getTime() - Date.now()
        const daysToDeadline = timeToDeadline / (1000 * 60 * 60 * 24)
        const urgency = Math.max(1, Math.min(5, Math.ceil(5 - daysToDeadline)))
        const complexity = Math.ceil((result.estMins || 60) / 120)
        result.priority = Math.max(1, Math.min(5, Math.ceil((urgency + complexity) / 2))) as 1 | 2 | 3 | 4 | 5
    }

    return result
}

function parseDateHeuristic(dateStr: string): string {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (dateStr.toLowerCase() === 'today') {
        return new Date(today.getTime() + 23 * 60 * 60 * 1000).toISOString()
    }

    if (dateStr.toLowerCase() === 'tomorrow') {
        return new Date(today.getTime() + 47 * 60 * 60 * 1000).toISOString()
    }

    if (dateStr.toLowerCase().includes('next week')) {
        return new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }

    if (dateStr.toLowerCase() === 'this week') {
        return new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }

    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const shortWeekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    let targetDay = -1
    const lowerStr = dateStr.toLowerCase()

    targetDay = weekdays.findIndex(day => day === lowerStr)
    if (targetDay === -1) {
        targetDay = shortWeekdays.findIndex(day => day === lowerStr)
    }
    // Also check if it starts with the day name (for partial matches)
    if (targetDay === -1) {
        targetDay = weekdays.findIndex(day => day.startsWith(lowerStr) && lowerStr.length >= 3)
    }

    if (targetDay !== -1) {
        const currentDay = now.getDay()
        let daysToAdd = targetDay - currentDay
        if (daysToAdd <= 0) daysToAdd += 7

        const targetDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
        targetDate.setHours(23, 59, 0, 0)
        return targetDate.toISOString()
    }

    const dateMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})/)
    if (dateMatch) {
        const month = parseInt(dateMatch[1]) - 1
        const day = parseInt(dateMatch[2])
        const year = now.getFullYear()
        const targetDate = new Date(year, month, day, 23, 59, 0, 0)

        if (targetDate.getTime() < now.getTime()) {
            targetDate.setFullYear(year + 1)
        }

        return targetDate.toISOString()
    }

    return new Date(today.getTime() + 47 * 60 * 60 * 1000).toISOString()
}

export async function generateSteps(task: Task): Promise<string[]> {
    const systemPrompt = `Generate a simple numbered list of 3-6 actionable steps to complete this task. Each step should be one clear action.

Task: ${task.title}
Type: ${task.type || 'homework'}
Estimated time: ${task.estMins} minutes

Format as:
1. [First step]
2. [Second step]  
3. [Third step]
etc.

Keep steps concise and actionable.`

    try {
        const response = await handleAsk(systemPrompt + (task.notes ? '\nNotes: ' + task.notes : ''))
        const steps = parseNumberedList(response.answer)
        return steps.length > 0 ? steps : getDefaultSteps(task.type)
    } catch (error) {
        console.warn('Step generation failed, using defaults:', error)
        return getDefaultSteps(task.type)
    }
}

function parseNumberedList(text: string): string[] {
    const steps: string[] = []
    const lines = text.split('\n')

    for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.+)$/)
        if (match) {
            steps.push(match[1].trim())
        }
    }

    return steps
}

function getDefaultSteps(type?: TaskType): string[] {
    switch (type) {
        case 'homework':
            return ['Review notes', 'Solve problems', 'Check work', 'Submit']
        case 'essay':
            return ['Research', 'Outline', 'Draft', 'Revise', 'Submit']
        case 'project':
            return ['Plan', 'Build', 'Test', 'Document', 'Present']
        case 'lab':
            return ['Read manual', 'Set up', 'Collect data', 'Analyze', 'Report']
        case 'exam':
            return ['Review syllabus', 'Study notes', 'Practice', 'Self-test']
        default:
            return ['Start task', 'Work on it', 'Review', 'Complete']
    }
}

export function calculateUrgencyScore(task: Task): number {
    const now = new Date().getTime()
    const dueTime = new Date(task.dueAt).getTime()
    const timeToDeadline = Math.max(1, dueTime - now) / (1000 * 60 * 60)

    const W_URGENCY = 0.5
    const W_PRIORITY = 0.3
    const W_EFFORT = 0.2

    const urgencyScore = 1 / Math.max(1, timeToDeadline / 24)
    const priorityScore = task.priority / 5
    const effortScore = Math.min(1, task.estMins / 240)

    return W_URGENCY * urgencyScore + W_PRIORITY * priorityScore + W_EFFORT * effortScore
}

export function makeSlots(tasks: Task[], policy: PlanPolicy): Slot[] {
    const sortedTasks = [...tasks].sort((a, b) =>
        calculateUrgencyScore(b) - calculateUrgencyScore(a)
    )

    const slots: Slot[] = []
    const now = new Date()

    for (const task of sortedTasks) {
        if (task.status === 'done') continue

        const taskSlots = generateTaskSlots(task, policy, now, slots)
        slots.push(...taskSlots)
    }

    return slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}

function generateTaskSlots(task: Task, policy: PlanPolicy, startTime: Date, existingSlots: Slot[]): Slot[] {
    const slots: Slot[] = []
    const dueDate = new Date(task.dueAt)
    const remainingMins = task.estMins

    const sessionMins = policy.pomodoroMins
    const sessions = Math.ceil(remainingMins / sessionMins)

    // For tasks due more than 1 day away, start scheduling from tomorrow instead of today
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const dayBeforeDue = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)

    // If task is due more than 24 hours away, prefer to schedule it closer to the due date
    let currentTime: Date
    if (dueDate.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
        currentTime = new Date(Math.max(tomorrow.getTime(), dayBeforeDue.getTime()))
    } else {
        currentTime = new Date(Math.max(startTime.getTime(), Date.now()))
    }

    let slotId = 1

    // Give ourselves a buffer - don't schedule right up to the deadline
    const scheduleDeadline = new Date(dueDate.getTime() - 2 * 60 * 60 * 1000) // 2 hours before due

    for (let i = 0; i < sessions; i++) {
        const sessionDuration = Math.min(sessionMins, remainingMins - (i * sessionMins))

        const slotStart = findNextAvailableSlot(currentTime, sessionDuration, scheduleDeadline, existingSlots, policy)

        if (!slotStart) {
            console.warn(`Cannot schedule task ${task.title} - no available slots found`)
            break
        }

        const slotEnd = new Date(slotStart.getTime() + sessionDuration * 60 * 1000)

        slots.push({
            id: `${task.id}-${slotId++}`,
            taskId: task.id,
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            kind: i === sessions - 1 ? 'review' : 'focus'
        })

        currentTime = new Date(slotEnd.getTime() + policy.breakMins * 60 * 1000)
    }

    return slots
}

function findNextAvailableSlot(
    fromTime: Date,
    durationMins: number,
    deadline: Date,
    existingSlots: Slot[],
    policy: PlanPolicy
): Date | null {
    const preferredStart = 8  // 8 AM instead of 4 PM
    const preferredEnd = 22   // 10 PM instead of 9 PM
    const maxDailyMins = policy.maxDailyMins || 240

    let searchTime = new Date(fromTime)

    if (searchTime.getHours() < preferredStart) {
        searchTime.setHours(preferredStart, 0, 0, 0)
    }

    for (let day = 0; day < 14; day++) {
        const dayStart = new Date(searchTime)
        dayStart.setHours(preferredStart, 0, 0, 0)

        const dayEnd = new Date(dayStart)
        dayEnd.setHours(preferredEnd, 0, 0, 0)

        // Don't restrict by deadline here - let the caller handle that
        if (dayStart > deadline) {
            break // No point searching beyond deadline
        }

        const daySlots = existingSlots.filter(slot => {
            const slotDate = new Date(slot.start)
            return slotDate.toDateString() === dayStart.toDateString()
        })

        const dayMinsUsed = daySlots.reduce((total, slot) => {
            const duration = (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / (1000 * 60)
            return total + duration
        }, 0)

        if (dayMinsUsed + durationMins > maxDailyMins) {
            searchTime.setDate(searchTime.getDate() + 1)
            continue
        }

        let currentSlot = new Date(Math.max(dayStart.getTime(), searchTime.getTime()))

        while (currentSlot.getTime() + durationMins * 60 * 1000 <= dayEnd.getTime()) {
            const proposedEnd = new Date(currentSlot.getTime() + durationMins * 60 * 1000)

            const hasConflict = existingSlots.some(slot => {
                const slotStart = new Date(slot.start)
                const slotEnd = new Date(slot.end)
                return (currentSlot < slotEnd && proposedEnd > slotStart)
            })

            if (!hasConflict) {
                return currentSlot
            }

            currentSlot.setMinutes(currentSlot.getMinutes() + 15)
        }

        searchTime.setDate(searchTime.getDate() + 1)
        searchTime.setHours(preferredStart, 0, 0, 0)
    }

    return null
}

export function replan(missedSlots: Slot[], remainingSlots: Slot[], tasks: Task[], policy: PlanPolicy): Slot[] {
    const affectedTaskIds = new Set([
        ...missedSlots.map(s => s.taskId),
        ...remainingSlots.map(s => s.taskId)
    ])

    const affectedTasks = tasks.filter(t => affectedTaskIds.has(t.id))

    const unaffectedSlots = remainingSlots.filter(s => !affectedTaskIds.has(s.taskId))

    const tasksWithAdjustedTime = affectedTasks.map(task => {
        const completedSlots = missedSlots.filter(s => s.taskId === task.id && s.done)
        const completedMins = completedSlots.reduce((total, slot) => {
            const duration = (new Date(slot.end).getTime() - new Date(slot.start).getTime()) / (1000 * 60)
            return total + duration
        }, 0)

        return {
            ...task,
            estMins: Math.max(15, task.estMins - completedMins)
        }
    })

    const newSlots = makeSlots(tasksWithAdjustedTime, policy)

    return [...unaffectedSlots, ...newSlots].sort((a, b) =>
        new Date(a.start).getTime() - new Date(b.start).getTime()
    )
}