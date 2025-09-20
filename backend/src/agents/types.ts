export type MsgRole = "system" | "user" | "assistant"

export type Msg = {
  role: MsgRole
  content: string
}

export type Ctx = {
  ns?: string
  sid?: string
  mem?: Record<string, any>
}

export type ToolIO = {
  name: string
  desc: string
  schema: any
  run: (i: any, c: Ctx) => Promise<any>
}

export type Agent = {
  id: string
  name: string
  sys: string
  tools: ToolIO[]
}

export type PlanStep = {
  tool: string
  input: any
}

export type Plan = {
  steps: PlanStep[]
}

export type Route = {
  tool: string
  input: any
}

export type ActOut = {
  output: any
  raw?: any
}

export type ReflectOut = {
  ok: boolean
  fix?: any
}

export type Turn = {
  msgs: Msg[]
  ctx: Ctx
}

export type ExecIn = {
  agent: string
  input: string
  ctx?: Ctx
  plan?: Plan
  threadId?: string
}

export type ExecOut = {
  trace: any[]
  result: any
  threadId: string
}