export default function ActionRow({
  disabled,
  onSummarize,
  onLearnMore,
  onStartQuiz,
  onCreatePodcast,
}: {
  disabled?: boolean;
  onSummarize?: () => void;
  onLearnMore?: () => void;
  onStartQuiz?: () => void;
  onCreatePodcast?: () => void;
}) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
      {[
        {
          label: "Summarize Response",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
            </svg>
          ),
          onClick: onSummarize
        },
        {
          label: "Start Practice Quiz",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M5.625 3.75a2.625 2.625 0 1 0 0 5.25h12.75a2.625 2.625 0 0 0 0-5.25H5.625ZM3.75 11.25a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75ZM3 15.75a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75ZM3.75 18.75a.75.75 0 0 0 0 1.5h16.5a.75.75 0 0 0 0-1.5H3.75Z" />
            </svg>
          ),
          onClick: onStartQuiz
        },
        {
          label: "Create Podcast",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z" />
            </svg>
          ),
          onClick: onCreatePodcast
        },
        {
          label: "Learn More",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c.966 0 1.89.166 2.75.47a.75.75 0 0 0 1-.708V4.262a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
            </svg>
          ),
          onClick: onLearnMore
        }
      ].map((btn, i) => (
        <button
          key={i}
          onClick={btn.onClick}
          disabled={disabled}
          className="flex-1 min-w-[140px] sm:min-w-[180px] md:min-w-[200px] bg-stone-950 hover:bg-stone-900 border border-stone-900 hover:border-stone-800 text-stone-200 hover:text-white rounded-2xl px-5 py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
        >
          {btn.icon}
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  )

}