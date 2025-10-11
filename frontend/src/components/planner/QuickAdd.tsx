import { useState, useRef } from "react"

interface QuickAddProps {
    onAdd: (data: { text?: string; files?: File[] }) => Promise<void>
    loading: boolean
}

export default function QuickAdd({ onAdd, loading }: QuickAddProps) {
    const [text, setText] = useState("")
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleSubmit = async () => {
        if (!text.trim() && selectedFiles.length === 0) return
        await onAdd({ text, files: selectedFiles })
        setText("")
        setSelectedFiles([])
    }

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return
        const newFiles = Array.from(files).filter(f =>
            f.size <= 10 * 1024 * 1024 && // 10MB limit
            (f.type.includes('pdf') || f.type.includes('image') || f.type.includes('text') || f.type.includes('document'))
        )
        setSelectedFiles(prev => [...prev, ...newFiles])
    }

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-zinc-200 font-medium mb-3 flex items-center gap-2">
                <span>⚡</span>
                Quick Add
            </div>

            <div className="space-y-3">
                <div className="flex gap-2">
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="e.g. Math homework ch 5 due tomorrow 8pm ~2h"
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-500 outline-none focus:ring-1 focus:ring-zinc-700"
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                        onChange={e => handleFileSelect(e.target.files)}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700"
                        title="Upload homework files"
                    >
                        📎
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (!text.trim() && selectedFiles.length === 0)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60 hover:bg-blue-700"
                    >
                        {loading ? "Adding..." : "Add"}
                    </button>
                </div>

                {/* Selected Files Display */}
                {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-200">
                                <span className="truncate max-w-32" title={file.name}>{file.name}</span>
                                <span className="text-zinc-400">({Math.round(file.size / 1024)}KB)</span>
                                <button
                                    onClick={() => removeFile(i)}
                                    className="text-zinc-400 hover:text-zinc-200 ml-1"
                                >×</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Templates */}
                <div className="flex flex-wrap gap-2">
                    <div className="text-zinc-400 text-xs">Quick templates:</div>
                    <button
                        onClick={() => setText("Math homework due tomorrow 8pm ~1.5h")}
                        className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                        Math HW
                    </button>
                    <button
                        onClick={() => setText("Read chapter for English class due Friday ~30m")}
                        className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                        Reading
                    </button>
                    <button
                        onClick={() => setText("Study for quiz next week ~2h")}
                        className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    >
                        Study
                    </button>
                </div>
            </div>
        </div>
    )
}