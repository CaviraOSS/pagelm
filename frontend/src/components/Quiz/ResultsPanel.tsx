import type { UA } from "../../pages/Quiz";

export default function ResultsPanel({
  score, total, percentage, visual, answers, onRetake, onReview, onNewTopic
}: {
  score: number; total: number; percentage: number;
  visual: { msg: string; cls: string; icon: React.ReactNode };
  answers: UA[]; onRetake: () => void; onReview: () => void; onNewTopic: () => void;
}) {
  const correct = answers.filter(a => a.correct).length;
  return (
    <div id="resultsScreen" className="text-center space-y-6">
      <div className="bg-stone-950 border border-stone-900 rounded-2xl p-8">
        <div id="resultIcon" className="text-6xl mb-4">{visual.icon}</div>
        <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
        <p className="text-xl text-stone-300 mb-6">
          Your Score: <span id="finalScore" className="text-blue-400 font-bold">{score}/{total} ({percentage}%)</span>
        </p>

        <div id="resultMessage" className={`mb-6 p-4 rounded-xl ${visual.cls}`}>
          <p className="text-lg font-medium">{visual.msg}</p>
        </div>

        <div className="mb-6 text-left">
          <h3 className="text-white font-semibold mb-3">Performance Breakdown:</h3>
          <div id="performanceStats" className="space-y-2 text-sm">
            <div className="flex justify-between text-stone-300">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="size-4 text-green-400" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                </svg>
                Correct Answers:
              </span>
              <span className="text-green-400 font-medium">{correct}</span>
            </div>

            <div className="flex justify-between text-stone-300">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Incorrect Answers:
              </span>
              <span className="text-red-400 font-medium">{answers.length - correct}</span>
            </div>

            <div className="flex justify-between text-stone-300">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="size-4 text-sky-400" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.99 14.993 6-6m6 3.001c0 1.268-.63 2.39-1.593 3.069a3.746 3.746 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043 3.745 3.745 0 0 1-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.746 3.746 0 0 1-1.043-3.297 3.746 3.746 0 0 1-1.593-3.068c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 0 1 1.043-3.297 3.745 3.745 0 0 1 3.296-1.042 3.745 3.745 0 0 1 3.068-1.594c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.297 3.746 3.746 0 0 1 1.593 3.068ZM9.74 9.743h.008v.007H9.74v-.007Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 4.5h.008v.008h-.008v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                Accuracy:
              </span>
              <span className="text-sky-400 font-medium">
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2">
          <button onClick={onRetake} className="bg-stone-900 hover:bg-stone-800 border border-stone-900 hover:border-stone-800 text-stone-200 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Retake Quiz
          </button>

          <button onClick={onReview} className="bg-stone-900 hover:bg-stone-800 border border-stone-900 hover:border-stone-800 text-stone-200 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178-.07.207-.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Review Answers
          </button>

          <button onClick={onNewTopic} className="bg-stone-900 hover:bg-stone-800 border border-stone-900 hover:border-stone-800 text-stone-200 hover:text-white rounded-xl px-6 py-3 font-medium transition-all duration-300 flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75a8.987 8.987 0 0 0-3 .512v14.25A8.987 8.987 0 0 0 6 18a8.967 8.967 0 0 1 6 2.292m0-14.25A8.966 8.966 0 0 1 18 3.75a8.987 8.987 0 0 1 3 .512v14.25A8.987 8.987 0 0 1 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            New Topic
          </button>
        </div>
      </div>
    </div>
  );
}