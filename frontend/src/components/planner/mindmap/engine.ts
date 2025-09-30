import { forceSimulation, forceManyBody, forceCollide, forceRadial, type Simulation } from "d3-force"

export type Node = { id: string; x: number; y: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null; type: 'center' | 'step'; taskId?: string; label?: string }

export type TaskSim = {
    sim: Simulation<any, any>
    nodes: Node[]
    center: Node
}

export function buildTaskSim(taskId: string, cx: number, cy: number, steps: Array<{ id: string; x: number; y: number; label: string }>, onTick: (positions: Record<string, { x: number; y: number }>) => void): TaskSim {
    const center: Node = { id: `t:${taskId}`, x: cx, y: cy, fx: cx, fy: cy, type: 'center' }
    const nodes: Node[] = [center]
    for (const s of steps) nodes.push({ id: `s:${s.id}`, x: s.x + 42, y: s.y + 14, type: 'step', taskId, label: s.label })
    const sim = forceSimulation(nodes)
        .force('charge', forceManyBody().strength(-60))
        .force('radial', forceRadial(120, cx, cy).strength(0.09))
        .force('collide', forceCollide(36))
        .alpha(0.6)
        .alphaDecay(0.08)
    sim.on('tick', () => {
        const out: Record<string, { x: number; y: number }> = {}
        for (const n of nodes) if (n.type === 'step' && n.taskId && typeof n.x === 'number' && typeof n.y === 'number') out[`${n.taskId}::${n.label}`] = { x: n.x - 42, y: n.y - 14 }
        if (Object.keys(out).length) onTick(out)
    })
    return { sim: sim as any, nodes, center }
}

export function recenterTaskSim(ts: TaskSim, cx: number, cy: number) {
    ts.center.fx = cx; ts.center.fy = cy
    ts.sim.force('radial', forceRadial(120, cx, cy).strength(0.09))
    ts.sim.alphaTarget(0.7).restart()
}

export function pinStep(ts: TaskSim, key: string, wx: number, wy: number) {
    const id = `s:${key}`
    const n = ts.nodes.find(n => n.id === id)
    if (n) { n.fx = wx + 42; n.fy = wy + 14; ts.sim.alphaTarget(0.7).restart() }
}

export function releaseStep(ts: TaskSim, key: string) {
    const id = `s:${key}`
    const n = ts.nodes.find(n => n.id === id)
    if (n) { n.fx = null; n.fy = null; ts.sim.alphaTarget(0) }
}

export function stopAll(map: Record<string, TaskSim>) {
    for (const k of Object.keys(map)) try { map[k].sim.stop() } catch { }
}
