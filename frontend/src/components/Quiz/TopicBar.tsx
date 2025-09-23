export default function TopicBar({
  value,
  onChange,
  onStart,
  phase,
  isLoading = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onStart: () => void;
  phase?: string;
  isLoading?: boolean;
}) {
  const disabled = !value.trim() || isLoading;
  return (
    <div className="sticky top-4 z-10 bg-black/50 backdrop-blur border border-stone-900 rounded-3xl p-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a topic to generate a quiz (e.g., Special Relativity)"
          className="flex-1 bg-stone-950 border border-stone-900 rounded-3xl px-5 py-3 text-stone-100 placeholder-stone-500 outline-none"
        />
        <button
          onClick={onStart}
          disabled={disabled}
          className="rounded-full bg-stone-800 hover:bg-stone-700 duration-300 transition-all hover:text-white px-5 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="size-4 animate-spin" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path d="M4 12a8 8 0 0 1 8-8" className="opacity-75" fill="currentColor" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              Start Quiz
              <svg viewBox="0 0 24 24" className="size-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12l18-9-6.75 9L21 21 3 12z" fill="currentColor" />
              </svg>
            </>
          )}
        </button>
      </div>
      {phase && <div className="text-xs text-stone-500 mt-2">Status: {phase}</div>}
    </div>
  );
}
