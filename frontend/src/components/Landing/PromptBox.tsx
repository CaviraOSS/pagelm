import React, { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onPickFile: () => void;
  onRemoveFile: () => void;
  stagedFileName: string | null;
  busy?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
};

export default function PromptBox({
  value,
  onChange,
  onSend,
  onPickFile,
  onRemoveFile,
  stagedFileName,
  busy,
  onDragOver,
  onDrop,
}: Props) {

  return (
    <div
      className="rounded-3xl bg-stone-950 border border-stone-900 shadow-[inset_0_3px_15px] shadow-stone-900 flex items-start rounded-bl-none rounded-br-none md:rounded-br-3xl"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex-1 p-3">
        {stagedFileName && (
          <div className="mb-3 inline-flex items-center gap-3 bg-stone-900/60 border border-stone-800 rounded-2xl px-3 py-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-rose-300" fill="currentColor">
                <path d="M9 2a1 1 0 0 0-1 1v4H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2V3a1 1 0 0 0-1-1H9Zm5 5H10V4h4v3Z" />
              </svg>
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-stone-100 text-sm">{stagedFileName}</span>
              <span className="text-stone-400 text-xs">Attached</span>
            </div>
            <button onClick={onRemoveFile} className="ml-2 text-stone-300 hover:text-white p-1 rounded-lg hover:bg-stone-800" aria-label="Remove file">
              ✕
            </button>
          </div>
        )}

        <textarea
          rows={1}
          placeholder="Ask me to teach you anything..."
          className="w-full text-stone-200 bg-transparent rounded-2xl p-2.5 outline-none resize-none leading-6 min-h-[40px]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          aria-label="Main prompt"
        />
      </div>

      <div className="h-full w-fit p-2 flex flex-col space-y-2">
        <button
          className="rounded-full bg-stone-900 hover:bg-stone-800 duration-300 transition-all hover:text-white p-2.5"
          aria-label="Attach file"
          onClick={onPickFile}
          disabled={busy}
          title={stagedFileName ?? "Upload files"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path
              fillRule="evenodd"
              d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <button
          onClick={onSend}
          disabled={busy || !value.trim()}
          className="rounded-full bg-stone-900 hover:bg-stone-800 duration-300 transition-all hover:text-white p-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send"
          title={busy ? "Please wait..." : "Send"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}