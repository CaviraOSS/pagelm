import React from "react";

type Props = {
  selected: { text: string; x: number; y: number } | null;
  addNote: (text: string) => void;
  askDoubt: (text: string) => void;
  popupRef: React.RefObject<HTMLDivElement | null>;
};

export default function SelectionPopup({ selected, addNote, askDoubt, popupRef }: Props) {
  if (!selected) return null;
  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-stone-950/50 border border-stone-900 rounded-xl p-2 shadow-xl backdrop-blur-md"
      style={{ left: selected.x, top: selected.y + 10, transition: "opacity .15s" }}
    >
      <button
        onClick={() => addNote(selected.text)}
        className="bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 active:scale-95 mr-1"
      >
        📝 Add Note
      </button>
      <button
        onClick={() => askDoubt(selected.text)}
        className="bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-200 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 active:scale-95 ml-1"
      >
        ❓ Ask Doubt
      </button>
    </div>
  );
}