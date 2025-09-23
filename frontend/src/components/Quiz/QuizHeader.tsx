export default function QuizHeader({ topic, idx, total, score }:{ topic:string; idx:number; total:number; score:number }) {
  const pct = Math.round(((idx + 1) / total) * 100);
  return (
    <div id="quizHeader" className="text-center mb-8">
      <h1 className="text-3xl font-bold text-white mb-2">{topic}</h1>
      <p className="text-stone-400">Test your knowledge with {total} questions</p>
      <div className="mt-4 bg-stone-950 rounded-2xl p-4 inline-block">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-stone-300">Question <span id="currentQuestion">{Math.min(idx + 1, total)}</span> of <span id="totalQuestions">{total}</span></span>
          <div className="w-48 bg-stone-800 rounded-full h-2">
            <div id="progressBar" className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-stone-300">Score: <span id="currentScore">{score}</span></span>
        </div>
      </div>
    </div>
  );
}