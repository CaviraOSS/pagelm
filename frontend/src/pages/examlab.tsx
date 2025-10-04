import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getExams, startExam, connectExamStream, type ExamEvent } from "../lib/api"
import LoadingIndicator from "../components/Chat/LoadingIndicator"
import QuizHeader from "../components/Quiz/QuizHeader"
import QuestionCard from "../components/Quiz/QuestionCard"
import ResultsPanel from "../components/Quiz/ResultsPanel"
import ReviewModal from "../components/Quiz/ReviewModal"

export type Question = {
  id: number
  question: string
  options: string[]
  correct: number
  hint: string
  explanation: string
  imageHtml?: string
}

export type UA = {
  questionId: number
  selectedAnswer: number
  correct: boolean
  question: string
  selectedOption: string
  correctOption: string
  explanation: string
}

export default function ExamLabs() {
  const [exams, setExams] = useState<any[]>([])
  const [loadingExams, setLoadingExams] = useState(true)

  const [qs, setQs] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [showExp, setShowExp] = useState(false)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<UA[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)

  const [connecting, setConnecting] = useState(false)
  const [activeExam, setActiveExam] = useState<string | null>(null)

  const closeRef = useRef<null | (() => void)>(null)
  const navigate = useNavigate()

  const total = qs.length
  const q = qs[idx]

  const percentage = useMemo(
    () => (total ? Math.round((score / total) * 100) : 0),
    [score, total]
  )

  const resultVisual = useMemo(() => {
    if (percentage >= 90) return { msg: "Excellent!", cls: "bg-green-900/20 border border-green-700 text-green-200", icon: "🏆" }
    if (percentage >= 70) return { msg: "Great job!", cls: "bg-blue-900/20 border border-blue-700 text-blue-200", icon: "🎉" }
    if (percentage >= 50) return { msg: "Good effort!", cls: "bg-yellow-900/20 border border-yellow-700 text-yellow-200", icon: "📚" }
    return { msg: "Keep studying!", cls: "bg-red-900/20 border border-red-700 text-red-200", icon: "💪" }
  }, [percentage])

  useEffect(() => {
    (async () => {
      try {
        const r = await getExams()
        setExams(r.exams || [])
      } finally {
        setLoadingExams(false)
      }
    })()
    return () => { if (closeRef.current) closeRef.current() }
  }, [])

  async function start(id: string) {
    if (closeRef.current) closeRef.current()
    setQs([])
    setIdx(0)
    setScore(0)
    setDone(false)
    setAnswers([])
    setSelected(null)
    setActiveExam(id)
    setConnecting(true)

    try {
      const { runId } = await startExam(id)
      const { close } = connectExamStream(runId, (ev: ExamEvent) => {
        if (ev.type === "exam") {
          const arr = Array.isArray(ev.payload) ? ev.payload : []
          setQs(arr.map((q: any) => ({ ...q, correct: Math.max(0, q.correct - 1) })))
          setIdx(0)
          setConnecting(false)
        }
        if (ev.type === "done" || ev.type === "error") {
          setConnecting(false)
        }
      })
      closeRef.current = close
    } catch {
      setConnecting(false)
    }
  }

  const onSelect = (i: number) => { if (!showExp) setSelected(i) }
  const onNext = () => {
    if (selected == null || !q) return
    const correct = selected === q.correct
    const ua: UA = {
      questionId: q.id,
      selectedAnswer: selected,
      correct,
      question: q.question,
      selectedOption: q.options[selected],
      correctOption: q.options[q.correct],
      explanation: q.explanation,
    }
    setAnswers(a => [...a, ua])
    setShowExp(true)
    if (correct) setScore(s => s + 1)
    setTimeout(() => {
      if (idx === total - 1) setDone(true)
      else {
        setIdx(n => n + 1)
        setSelected(null)
        setShowHint(false)
        setShowExp(false)
      }
    }, 350)
  }

  // --- UI: Exam List ---
  if (!activeExam) {
    return (
  <div className="min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
    <div className="max-w-5xl mx-auto pt-10 pb-14">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-stone-950 border border-zinc-800 hover:bg-stone-900 transition-colors"
            aria-label="Back"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-stone-300"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-white">Exam Labs</h1>
        </div>
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium">
          BETA
        </div>
      </div>

      {loadingExams && <LoadingIndicator label="Loading exams…" />}

      <div className="grid gap-6">
        {exams.map((ex) => (
          <div
            key={ex.id}
            onClick={() => start(ex.id)}
            className="group rounded-2xl bg-stone-950 border border-zinc-800 p-5 cursor-pointer hover:border-sky-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-white">
                {ex.name}
              </div>
              <div className="px-3 py-1 rounded-full bg-sky-900/30 text-sky-300 text-xs font-medium">
                {ex.sections.length} sections
              </div>
            </div>
            <div className="text-sm text-stone-400">
              Click to start this exam
            </div>
          </div>
        ))}
      </div>

      {!loadingExams && !exams.length && (
        <div className="mt-16 text-center text-stone-400">
          No exams available.
        </div>
      )}
    </div>
  </div>
    )
  }

  // --- UI: Exam Taking ---
  return (
    <div className="flex flex-col min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="w-full max-w-4xl mx-auto p-4 pt-8 pb-24 my-auto">
        {connecting && (
          <div className="mt-10">
            <LoadingIndicator label="Building your exam…" />
          </div>
        )}

        {qs.length > 0 && !done && q && (
          <>
            <QuizHeader topic={activeExam || "Exam"} idx={idx} total={total} score={score} />
            <QuestionCard
              q={q}
              selected={selected}
              showExp={showExp}
              showHint={showHint}
              onSelect={onSelect}
              onHint={() => setShowHint(true)}
              onNext={onNext}
              isLast={idx === total - 1}
            />
          </>
        )}

        {done && (
          <ResultsPanel
            score={score}
            total={total}
            percentage={percentage}
            visual={resultVisual}
            answers={answers}
            onRetake={() => start(activeExam)}
            onReview={() => setReviewOpen(true)}
            onNewTopic={() => setActiveExam(null)}
          />
        )}

        {reviewOpen && (
          <ReviewModal answers={answers} onClose={() => setReviewOpen(false)} />
        )}
      </div>
    </div>
  )
}
