import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PromptRail from "../components/Landing/PromptRail";
import PromptBox from "../components/Landing/PromptBox";
import ExploreTopics from "../components/Landing/ExploreTopics";
import { chatMultipart, chatJSON } from "../lib/api";

export default function Landing() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"Chat" | "Quiz">("Chat");
  const [responseLength, setResponseLength] = useState<"Short" | "Medium" | "Long">("Medium");
  const [showMode, setShowMode] = useState(false);
  const [showLength, setShowLength] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onPickFile = () => fileRef.current?.click();
  const onRemoveFile = () => setStagedFile(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setStagedFile(f);
  };
  const onDropZoneDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    setStagedFile(f);
  };

  const onSend = async (override?: string) => {
    if (busy) return;
    const q = (override ?? prompt).trim();
    if (!q && !stagedFile) return;

    if (mode === "Quiz") {
      navigate(`/quiz?topic=${encodeURIComponent(q)}`, { state: { topic: q } });
      return;
    }

    setBusy(true);
    try {
      if (stagedFile) {
        const { chatId } = await chatMultipart(q || " ", [stagedFile]);
        navigate(`/chat?chatId=${encodeURIComponent(chatId)}&q=${encodeURIComponent(q)}`);
        return;
      }
      const r = await chatJSON({ q });
      navigate(`/chat?chatId=${encodeURIComponent(r.chatId)}&q=${encodeURIComponent(q)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto my-20 md:my-4 w-full px-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white font-semibold pl-3 border-l-2 border-sky-500 mb-8">
          What&apos;d you like to learn today?
        </h1>

        <PromptBox
          value={prompt}
          onChange={setPrompt}
          onSend={() => onSend()}
          onPickFile={onPickFile}
          onRemoveFile={onRemoveFile}
          stagedFileName={stagedFile?.name || null}
          busy={busy}
          onDragOver={onDropZoneDragOver}
          onDrop={onDropZoneDrop}
        />

        <div className="w-full md:w-fit flex">
          <div className="w-full md:w-fit md:min-w-fit p-1.5 rounded-2xl rounded-t-none bg-stone-950 flex flex-col items-start sm:items-center border border-stone-900 border-t-0 border-r-0 border-b-0 sm:border-b shadow-[inset_2px_-2px_15px] shadow-stone-900/80">
            <div className="flex items-start justify-between md:justify-start space-x-2 p-1.5 w-full">
              <div className="relative">
                <div
                  onClick={() => setShowMode(!showMode)}
                  className="flex items-center space-x-4 p-1.5 rounded-xl hover:bg-white/5 duration-300 transition-all cursor-pointer"
                >
                  <div className="flex flex-col -space-y-0.5 pr-2">
                    <span className="text-xs text-stone-300">Prompt Mode</span>
                    <span className="text-sm font-semibold text-white">{mode}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-stone-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                  </svg>
                </div>

                {showMode && (
                  <div className="absolute top-full left-0 mt-1 p-1 w-36 bg-stone-950 border border-stone-800 rounded-xl shadow-lg z-20">
                    {["Chat", "Quiz"].map((opt) => (
                      <div
                        key={opt}
                        onClick={() => {
                          setMode(opt as "Chat" | "Quiz");
                          setShowMode(false);
                        }}
                        className={`px-3 py-2 cursor-pointer hover:bg-stone-800 transition rounded-lg ${mode === opt ? "text-sky-400" : "text-white"
                          }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-8 mx-2 bg-white/10 rounded-full mt-2" />

              <div className="p-1.5 rounded-xl hover:bg-white/5 duration-300 transition-all cursor-pointer min-w-fit h-fit hidden md:flex items-center space-x-4" onClick={onPickFile} title={stagedFile ? stagedFile.name : "Click or drop"}>
                <div className="flex flex-col -space-y-0.5 pr-2">
                  <span className="text-xs text-stone-300">{stagedFile ? "File selected" : "Add files"}</span>
                  <span className="text-sm font-semibold text-white">{stagedFile ? stagedFile.name : "Click or drop"}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-6 text-stone-400">
                  <path
                    fillRule="evenodd"
                    d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="w-px h-8 mx-2 bg-white/10 rounded-full mt-2" />

              <div className="relative">
                <div
                  onClick={() => setShowLength(!showLength)}
                  className="flex items-center space-x-4 p-1.5 rounded-xl hover:bg-white/5 duration-300 transition-all cursor-pointer">
                  <div className="flex flex-col -space-y-0.5 pr-2">
                    <span className="text-xs text-stone-300">Response Length</span>
                    <span className="text-sm font-semibold text-white">{responseLength}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-stone-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                  </svg>
                </div>

                {showLength && (
                  <div className="absolute top-full left-0 mt-1 p-1 w-40 bg-stone-950 border border-stone-800 rounded-xl shadow-lg z-20">
                    {["Short", "Medium", "Long"].map((opt) => (
                      <div
                        key={opt}
                        onClick={() => {
                          setResponseLength(opt as "Short" | "Medium" | "Long");
                          setShowLength(false);
                        }}
                        className={`px-3 py-2 cursor-pointer hover:bg-stone-800 transition rounded-lg ${responseLength === opt ? "text-sky-400" : "text-white"
                          }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          <svg className="h-9 w-8 -ml-0.5 -mt-[2px] min-w-fit hidden md:block rotate-3" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1H71C21.4764 5.44502 6.18653 20.4467 1 71V1Z" fill="#101110" strokeWidth="2" stroke="url(#paint0_linear_1409_7)" />
            <defs>
              <linearGradient id="paint0_linear_1409_7" x1="33" y1="31" x2="1" y2="1" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0D0B0B" />
                <stop offset="1" stopColor="#070707" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <PromptRail onSend={(p) => onSend(p)} />
        </div>
      </div>

      <ExploreTopics />

      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />
    </div>
  );
}