import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { chatJSON } from "../../lib/api";

export default function ExploreTopics() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const moreRows = useMemo(
    () => [
      ["History", "Geography", "Music"],
      ["Art", "Technology", "Philosophy"],
    ],
    []
  );

  const imgSrc = (title: string) => `/pictures/${encodeURIComponent(title.toLocaleLowerCase())}.png`;

  const promptFor = (topic: string) =>
    `Give me a clear, beginner-friendly lesson on ${topic}`;

  const startTopic = async (title: string) => {
    if (busy) return;
    try {
      setBusy(true);
      const q = promptFor(title);
      const r = await chatJSON({ q });
      navigate(`/chat?chatId=${encodeURIComponent(r.chatId)}&q=${encodeURIComponent(q)}`, {
        state: { chatId: r.chatId, q },
      });
    } finally {
      setBusy(false);
    }
  };

  const Card = ({ title, extra }: { title: string; extra?: string }) => (
    <button
      type="button"
      onClick={() => startTopic(title)}
      disabled={busy}
      className={`w-full h-48 relative rounded-3xl border border-stone-900 bg-stone-950 
                  hover:scale-105 transition-transform duration-200 ease-out 
                  focus:outline-none focus:ring-2 focus:ring-stone-700 disabled:opacity-60 ${extra || ""}`}
      title={busy ? "Starting…" : `Learn ${title}`}
    >
      <img src={imgSrc(title)} alt={title} className="w-full h-full rounded-3xl object-cover" draggable={false} />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent to-black" />
      <div className="absolute right-0 bottom-0 pr-4 pb-4 text-stone-200 text-xl sm:text-2xl">{title}</div>
    </button>
  );

  return (
    <div className="mt-auto pb-4 pt-4 relative">
      <div className="w-fit flex flex-col items-center mx-auto mb-8 cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-6"
          style={{
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path
            fillRule="evenodd"
            d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm">{busy ? "Starting…" : "EXPLORE TOPICS"}</span>
      </div>

      <div className="w-full max-w-4xl mx-auto overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <Card title="Mathematics" />
          <Card title="English" />
          <Card title="Science" extra="col-span-1 sm:col-span-2 lg:col-span-1" />
        </div>

        <div
          className="overflow-hidden"
          style={{
            transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            maxHeight: open ? 1000 : 0
          }}
        >
          {moreRows.map((row, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {row.map((title, j) => (
                <Card key={title} title={title} extra={j === 2 ? "col-span-1 sm:col-span-2 lg:col-span-1" : ""} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute w-full h-full bottom-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none"
        style={{
          transition: "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: open ? 0 : 1
        }}
      />
    </div>
  );
}