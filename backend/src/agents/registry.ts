import { Agent } from "./types"

const registry = new Map<string, Agent>()

export const reg = (a: Agent) => {
  registry.set(a.id, a)
  return a
}

export const get = (id: string) => registry.get(id)

export const all = () => [...registry.values()]