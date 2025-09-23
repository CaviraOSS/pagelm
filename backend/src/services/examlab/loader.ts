import fs from "fs"
import path from "path"
import yaml from "js-yaml"
import { ExamSpec } from "./types"

const modulesDir = path.join(process.cwd(), "modules")

export function loadExam(id: string): ExamSpec | null {
  const file = path.join(modulesDir, `${id}.yml`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  const data = yaml.load(raw)
  return normalizeExam(data)
}

export function loadAllExams(): ExamSpec[] {
  if (!fs.existsSync(modulesDir)) return []
  const files = fs.readdirSync(modulesDir).filter(f => f.endsWith(".yml"))
  return files.map(f => {
    try {
      const raw = fs.readFileSync(path.join(modulesDir, f), "utf8")
      const data = yaml.load(raw)
      return normalizeExam(data)
    } catch {
      return null
    }
  }).filter(Boolean) as ExamSpec[]
}

function normalizeExam(x: any): ExamSpec | null {
  if (!x?.id || !x?.name || !Array.isArray(x?.sections)) return null
  return {
    id: String(x.id),
    name: String(x.name),
    scoring: x.scoring || "right-only",
    sections: x.sections.map((s: any) => ({
      id: String(s.id),
      title: String(s.title || s.id),
      durationSec: Number(s.durationSec || 0),
      instructions: typeof s.instructions === "string" ? s.instructions : undefined,
      gen: s.gen || undefined,
      items: Array.isArray(s.items) ? s.items : undefined,
    })),
    rubrics: Array.isArray(x.rubrics) ? x.rubrics : []
  }
}
