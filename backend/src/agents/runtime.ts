import "./agents"
import { randomBytes } from "crypto"
import { get } from "./registry"
import { ExecIn, ExecOut } from "./types"

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  if (!ms || ms <= 0) return p
  let t: NodeJS.Timeout
  return await Promise.race([
    p.finally(() => clearTimeout(t!)),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(`timeout: ${label} exceeded ${ms}ms`)), ms) })
  ])
}

export async function execDirect({ agent, plan, ctx }: ExecIn): Promise<ExecOut> {
  const ag = get(agent)
  if (!ag) throw new Error(`agent_not_found: ${agent}`)

  const threadId = randomBytes(12).toString("hex")
  const trace: any[] = []
  let last: any = null

  for (let i = 0; i < (plan?.steps?.length || 0); i++) {
    const st = plan.steps[i] || {}
    const name = String(st.tool || "").trim()
    const input = st.input ?? {}
    const timeoutMs = Number.isFinite(st.timeoutMs) ? Number(st.timeoutMs) : 15000
    const retries = Number.isFinite(st.retries) ? Math.min(2, Math.max(0, Number(st.retries))) : 0

    const tool = ag.tools.find(t => t.name === name)
    if (!tool) throw new Error(`tool_not_found: "${name}" | have=${JSON.stringify(ag.tools.map(t => t.name))}`)

    let attempt = 0, ok = false, out: any, err: any
    while (attempt <= retries && !ok) {
      try {
        out = await withTimeout(tool.run(input, ctx || {}), timeoutMs, name)
        ok = true
      } catch (e) {
        err = e
        attempt++
        if (attempt > retries) throw e
      }
    }

    trace.push({ step: i + 1, tool: name, input, output: out, err: err ? String(err) : null, retries: attempt })
    last = out
  }

  return { trace, result: last, threadId }
}