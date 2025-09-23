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
      className="rounded-3xl bg-stone-950 border border-stone-900 shadow-[inset_0_3px_15px] shadow-stone-900 flex items-start rounded-bl-none"
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
          title={stagedFileName ?? "Stream voice mode"}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-5">
            <path d="M7.33496 15.5V4.5C7.33496 4.13275 7.63275 3.83499 8 3.83496C8.36727 3.83496 8.66504 4.13273 8.66504 4.5V15.5C8.66504 15.8673 8.36727 16.165 8 16.165C7.63275 16.165 7.33496 15.8673 7.33496 15.5ZM11.335 13.1309V7.20801C11.335 6.84075 11.6327 6.54298 12 6.54297C12.3673 6.54297 12.665 6.84074 12.665 7.20801V13.1309C12.665 13.4981 12.3672 13.7959 12 13.7959C11.6328 13.7959 11.335 13.4981 11.335 13.1309ZM3.33496 11.3535V8.81543C3.33496 8.44816 3.63273 8.15039 4 8.15039C4.36727 8.15039 4.66504 8.44816 4.66504 8.81543V11.3535C4.66504 11.7208 4.36727 12.0186 4 12.0186C3.63273 12.0186 3.33496 11.7208 3.33496 11.3535Z" />
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