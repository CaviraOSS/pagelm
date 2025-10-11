import { useState, useEffect } from "react"
import { plannerList, type PlannerTask, type PlannerSlot } from "../../lib/api"

function fmtTime(ts: number) {
    const d = new Date(ts)
    return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" })
}

interface TodayFocusProps {
    tasks: PlannerTask[]
    onStartSession: (taskId: string) => void
    onCompleteTask: (taskId: string) => void
}

export default function TodayFocus({ tasks, onStartSession, onCompleteTask }: TodayFocusProps) {
    const today = new Date().toISOString().slice(0, 10)

    // Get today's tasks and upcoming urgent tasks
    const todayTasks = tasks.filter(t => {
        const taskDate = new Date(t.dueAt).toISOString().slice(0, 10)
        return taskDate === today && t.status !== 'done'
    })

    const urgentTasks = tasks.filter(t => {
        const hoursUntilDue = (t.dueAt - Date.now()) / (1000 * 60 * 60)
        return hoursUntilDue < 24 && hoursUntilDue > 0 && t.status !== 'done'
    }).slice(0, 3)

    const activeTasks = tasks.filter(t => t.status === 'doing')

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-zinc-200 font-medium mb-4 flex items-center gap-2">
                <span>🎯</span>
                Today's Focus
            </div>

            <div className="space-y-4">
                {/* Active Sessions */}
                {activeTasks.length > 0 && (
                    <div>
                        <div className="text-zinc-300 text-sm mb-2">Currently Working On:</div>
                        <div className="space-y-2">
                            {activeTasks.map(task => (
                                <div key={task.id} className="bg-blue-900/30 border border-blue-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-blue-200 font-medium">{task.title}</div>
                                            <div className="text-blue-300 text-xs">
                                                {task.course} • {task.estMins} mins • Due {fmtTime(task.dueAt)}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onCompleteTask(task.id)}
                                            className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                                        >
                                            Complete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Due Today */}
                {todayTasks.length > 0 && (
                    <div>
                        <div className="text-zinc-300 text-sm mb-2">Due Today ({todayTasks.length}):</div>
                        <div className="space-y-2">
                            {todayTasks.slice(0, 3).map(task => (
                                <div key={task.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-zinc-200 font-medium">{task.title}</div>
                                            <div className="text-zinc-400 text-xs">
                                                {task.course} • {task.estMins} mins • P{task.priority}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onStartSession(task.id)}
                                            className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                                        >
                                            Start
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {todayTasks.length > 3 && (
                                <div className="text-zinc-400 text-xs text-center">
                                    +{todayTasks.length - 3} more tasks due today
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Urgent (Next 24h) */}
                {urgentTasks.length > 0 && (
                    <div>
                        <div className="text-zinc-300 text-sm mb-2">Urgent (Next 24h):</div>
                        <div className="space-y-2">
                            {urgentTasks.map(task => {
                                const hoursLeft = Math.max(0, (task.dueAt - Date.now()) / (1000 * 60 * 60))
                                return (
                                    <div key={task.id} className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-yellow-200 font-medium">{task.title}</div>
                                                <div className="text-yellow-300 text-xs">
                                                    {task.course} • Due in {Math.round(hoursLeft)}h • {task.estMins} mins
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onStartSession(task.id)}
                                                className="px-3 py-1 rounded bg-yellow-600 text-white text-xs hover:bg-yellow-700"
                                            >
                                                Start
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {todayTasks.length === 0 && urgentTasks.length === 0 && activeTasks.length === 0 && (
                    <div className="text-center py-8 text-zinc-400">
                        <div className="text-2xl mb-2">🎉</div>
                        <div className="text-sm">Nothing urgent today!</div>
                        <div className="text-xs text-zinc-500">Great job staying on top of your work.</div>
                    </div>
                )}
            </div>
        </div>
    )
}