import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatJSON } from "../../lib/api";

const PROMPTS = [
  "Teach me a lesson on Quadratic Equations. Assume I absolutely know nothing.",
  "Explain the basics of Photosynthesis.",
  "How do I write a compelling short story?",
  "What is Machine Learning and how does it work?",
  "Teach me the fundamentals of cooking.",
  "Help me understand the French Revolution.",
  "Explain programming concepts.",
  "How do I manage my personal finances?",
];

const ITEM_H = 32;

function useReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const on = () => setPrefers(!!m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return prefers;
}

export default function PromptRail({ onSend }: { onSend?: (prompt: string) => void }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(2);
  const [busy, setBusy] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % PROMPTS.length), 3500);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    let dragging = false, startY = 0, startIndex = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      startY = e.clientY;
      startIndex = index;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const delta = Math.round(-(e.clientY - startY) / ITEM_H);
      const next = Math.max(0, Math.min(PROMPTS.length - 1, startIndex + delta));
      if (next !== index) setIndex(next);
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [index]);

  const translateY = -(index * ITEM_H);

  const sendNow = async () => {
    const q = PROMPTS[index];
    if (busy) return;
    if (onSend) {
      onSend(q);
      return;
    }
    try {
      setBusy(true);
      const r = await chatJSON({ q });
      const cid = r?.chatId || "";
      navigate(`/chat?chatId=${encodeURIComponent(cid)}&q=${encodeURIComponent(q)}`, {
        state: { chatId: cid, q },
      });
    } catch {
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="items-center justify-center pt-2 mt-2 md:mt-0 hidden md:flex">
      <div className="relative z-0 rounded-3xl rounded-tl-[22px] rounded-bl-2xl md:rounded-r-none h-full p-2 px-4 border border-stone-800 md:border-r-0 text-sm flex items-center -ml-4 md:-ml-6.5 overflow-hidden max-w-sm">
        <div ref={railRef} className="h-8 overflow-hidden relative w-full cursor-grab active:cursor-grabbing">
          <div className="transition-transform duration-500 ease-in-out" style={{ transform: `translateY(${translateY}px)` }}>
            {PROMPTS.map((p, i) => (
              <div key={i} className="h-8 flex items-center">
                <span className="text-sm md:text-xs">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={sendNow}
        disabled={busy}
        className="h-full w-fit px-3 flex items-center justify-center bg-stone-900/50 border border-stone-900 border-l-0 rounded-r-2xl relative z-10 pointer-events-auto"
        aria-label="Send suggested prompt"
        title={busy ? "Starting..." : "Send"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
        </svg>
      </button>
    </div>
  );
}