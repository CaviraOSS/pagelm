export function normalizeTopic(input: any): string {
  if (input == null) return ""
  if (typeof input === "string") return input.trim()

  if (typeof input === "object") {
    const cand =
      input.topic ??
      input.title ??
      input.question ??
      input.query ??
      input.q ??
      input.text ??
      null

    if (typeof cand === "string" && cand.trim()) return cand.trim()
    try {
      const s = JSON.stringify(input)
      return s.length > 4000 ? s.slice(0, 4000) : s
    } catch {
      return String(input)
    }
  }

  return String(input).trim()
}