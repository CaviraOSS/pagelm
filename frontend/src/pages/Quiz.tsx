import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { quizStart, connectQuizStream, type QuizEvent } from "../lib/api";
import LoadingIndicator from "../components/Chat/LoadingIndicator";
import TopicBar from "../components/Quiz/TopicBar";
import QuizHeader from "../components/Quiz/QuizHeader";
import QuestionCard from "../components/Quiz/QuestionCard";
import ResultsPanel from "../components/Quiz/ResultsPanel";
import ReviewModal from "../components/Quiz/ReviewModal";

export type Question = { id: number; question: string; options: string[]; correct: number; hint: string; explanation: string; imageHtml?: string };
export type UA = { questionId: number; selectedAnswer: number; correct: boolean; question: string; selectedOption: string; correctOption: string; explanation: string };

function takeQuizArray(a: unknown): Question[] {
  if (Array.isArray(a)) return a as Question[];
  if (Array.isArray((a as any)?.quiz)) return (a as any).quiz as Question[];
  return [];
}

export default function Quiz() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation() as any;

  const passedTopic = (location?.state && location.state.topic) || "";
  const initialTopic = search.get("topic") || passedTopic || "";

  const [topic, setTopic] = useState(initialTopic);
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState<UA[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [connecting, setConnecting] = useState(false);

  const closeRef = useRef<null | (() => void)>(null);

  const total = qs.length;
  const q = qs[idx];

  const percentage = useMemo(() => (total ? Math.round((score / total) * 100) : 0), [score, total]);
  const resultVisual = useMemo(() => { if (percentage >= 90) return { msg: "Excellent! You have mastered this topic!", cls: "bg-green-900/20 border border-green-700 text-green-200", icon: "🏆" }; if (percentage >= 70) return { msg: "Great job! You have a solid understanding.", cls: "bg-blue-900/20 border border-blue-700 text-blue-200", icon: "🎉" }; if (percentage >= 50) return { msg: "Good effort! Review the concepts and try again.", cls: "bg-yellow-900/20 border border-yellow-700 text-yellow-200", icon: "📚" }; return { msg: "Keep studying! Practice makes perfect.", cls: "bg-red-900/20 border border-red-700 text-red-200", icon: "💪" }; }, [percentage]);

  useEffect(() => () => { if (closeRef.current) closeRef.current(); }, []);
  useEffect(() => { if (!initialTopic) return; start(initialTopic); }, [initialTopic]);

  function resetQuestionState() {
    setIdx(0);
    setSelected(null);
    setShowHint(false);
    setShowExp(false);
  }

  async function start(t: string) {
    const trimmed = t.trim();
    if (!trimmed) return;
    if (closeRef.current) closeRef.current();

    setQs([]);
    resetQuestionState();
    setScore(0);
    setDone(false);
    setAnswers([]);
    setConnecting(true);

    try {
      const s = await quizStart(trimmed);
      const { close } = connectQuizStream(s.quizId, (ev: QuizEvent) => {
        if (ev.type === "quiz") {
          const arr = takeQuizArray(ev.quiz).map(q => ({
            ...q,
            correct: typeof q.correct === "number" ? Math.max(0, q.correct - 1) : 0
          }));
          setQs(arr);
          resetQuestionState();
          setConnecting(false);
        }
        if (ev.type === "done" || ev.type === "error") {
          setConnecting(false);
        }
      });
      closeRef.current = close;

      if (search.get("topic") !== trimmed) {
        navigate(`/quiz?topic=${encodeURIComponent(trimmed)}`, {
          replace: true,
          state: { topic: trimmed },
        });
      }
    } catch {
      setConnecting(false);
    }
  }

  const onSelect = (i: number) => { if (!showExp) setSelected(i); };

  const onNext = () => {
    if (selected == null || !q) return;
    const correct = selected === q.correct;
    const ua: UA = {
      questionId: q.id,
      selectedAnswer: selected,
      correct,
      question: q.question,
      selectedOption: q.options[selected],
      correctOption: q.options[q.correct],
      explanation: q.explanation,
    };
    setAnswers(a => [...a, ua]);
    setShowExp(true);
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      if (idx === total - 1) setDone(true);
      else {
        setIdx(n => n + 1);
        setSelected(null);
        setShowHint(false);
        setShowExp(false);
      }
    }, 350);
  };

  const newTopic = () => { setDone(false); setQs([]); setTopic(""); setAnswers([]); resetQuestionState(); setScore(0); };

  return (
    <div className="flex flex-col min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="w-full max-w-4xl mx-auto p-4 pt-8 pb-24 my-auto">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to='/'
              className="p-2 rounded-xl bg-stone-950 border border-zinc-800 hover:bg-stone-900 transition-colors"
              aria-label="Back">
              <svg viewBox="0 0 24 24" className="size-5 text-stone-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">Quiz</h1>
          </div>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium">
            BETA
          </div>
        </div>

        {qs.length === 0 && !connecting && !done && (
          <TopicBar
            value={topic}
            onChange={setTopic}
            onStart={() => start(topic)}
          />
        )}

        {connecting && (
          <div className="mt-10"><LoadingIndicator label="Building a quiz for you…" /></div>
        )}

        {qs.length > 0 && !done && q && (
          <>
            <QuizHeader topic={topic || "Quiz"} idx={idx} total={total} score={score} />
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
            onRetake={() => { resetQuestionState(); setScore(0); setDone(false); setAnswers([]); }}
            onReview={() => setReviewOpen(true)}
            onNewTopic={newTopic}
          />
        )}

        {reviewOpen && (
          <ReviewModal answers={answers} onClose={() => setReviewOpen(false)} />
        )}
      </div>
    </div>
  );
}