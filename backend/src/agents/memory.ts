import fs from "fs"
import path from "path"

type M = Record<string, any>

const dir = path.join(process.cwd(), "storage", "agents")

const fileOf = (sid: string) => path.join(dir, `${sid}.json`)

export const load = (sid?: string) => {
  if (!sid) return {}
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const f = fileOf(sid)
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {}
}

export const save = (sid?: string, m?: M) => {
  if (!sid) return
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(fileOf(sid), JSON.stringify(m || {}, null, 0))
}