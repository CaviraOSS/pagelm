declare module "d3-force" {
    export interface SimulationNodeDatum { index?: number; x?: number; y?: number; vx?: number; vy?: number; fx?: number | null; fy?: number | null }
    export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum> { source: NodeDatum | string | number; target: NodeDatum | string | number }
    export interface Simulation<NodeDatum extends SimulationNodeDatum, LinkDatum extends SimulationLinkDatum<NodeDatum>> {
        nodes(nodes: NodeDatum[]): this
        force(name: string, force: any): this
        alpha(value: number): this
        alphaDecay(value: number): this
        alphaTarget(value: number): this
        on(typ: string, listener: (this: this) => void): this
        restart(): this
        stop(): this
    }
    export function forceSimulation<NodeDatum extends SimulationNodeDatum = SimulationNodeDatum>(nodes?: NodeDatum[]): Simulation<NodeDatum, any>
    export function forceManyBody(): any
    export function forceLink(links?: any[]): any
    export function forceCollide(radius?: number): any
    export function forceRadial(radius?: number, x?: number, y?: number): any
}
