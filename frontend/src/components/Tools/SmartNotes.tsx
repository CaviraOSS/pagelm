import { useState } from "react"
import { smartnotesStart, connectSmartnotesStream, type SmartNotesEvent } from "../../lib/api"

export default function SmartNotes() {
  const [topic, setTopic] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [filePath, setFilePath] = useState<string | null>(null)

  const onGenerate = async () => {
    if (!topic.trim() || busy) return
    setBusy(true)
    setStatus("Starting…")
    setFilePath(null)

    try {
      const { noteId } = await smartnotesStart({ topic })
      const { close } = connectSmartnotesStream(noteId, (ev: SmartNotesEvent) => {
        if (ev.type === "phase") setStatus(`Status: ${ev.value}`)
        if (ev.type === "file") { setFilePath(ev.file); setStatus("Ready") }
        if (ev.type === "done") { setStatus("Done"); close(); setBusy(false) }
        if (ev.type === "error") { setStatus(`Error: ${ev.error}`); close(); setBusy(false) }
      })
    } catch (e: any) {
      setStatus(e.message || "Failed")
      setBusy(false)
    }
  }

  return (
    <div className="group rounded-2xl bg-stone-950 border border-zinc-800 p-4 hover:border-sky-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs uppercase tracking-wide text-blue-400 font-semibold">notes generator</div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 animate-pulse"></div>
          </div>
          <div className="text-white font-semibold text-xl mb-2">SmartNotes</div>
          <div className="text-stone-300 text-sm leading-relaxed">
            Transform any topic into comprehensive, structured study notes. Perfect for exam prep and research.
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter your topic..."
              className="w-full px-4 py-3 pr-16 rounded-xl bg-stone-900/70 border border-zinc-700 text-white placeholder-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all duration-300"
              onKeyDown={(e) => e.key === "Enter" && onGenerate()}
            />
          </div>
          <button
            onClick={onGenerate}
            disabled={busy || !topic.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all duration-300"
          >
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>

        {status && (
          <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/40 text-sky-200 font-medium">{status}</div>
        )}

        {filePath && (
          <a
            href={filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-center"
          >
            Download Notes
          </a>
        )}
      </div>
    </div>
  )
}