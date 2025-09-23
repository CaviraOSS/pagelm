type Item = { id: string; kind: "flashcard" | "note"; title: string; content: string };

type Props = {
  open: boolean;
  items: Item[];
  onClose: () => void;
  onClear: () => void;
};

export default function BagDrawer({ open, items, onClose, onClear }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose}>
      <div className="absolute right-4 top-4 bottom-4 w-96 bg-stone-950 border border-stone-900 rounded-2xl p-6 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">📝 My Learning Bag</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-900 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center text-stone-400 py-8">
                <img
                  src="https://forum.playhive.com/uploads/default/original/3X/f/3/f3e340eef1c12e1080f55958d70c5afc8a73dfa3.png"
                  alt="empty bag"
                  className="h-16 w-auto mx-auto opacity-50 mb-4"
                />
                <p>Your bag is empty</p>
                <p className="text-sm">Add flashcards and notes to get started!</p>
              </div>
            ) : (
              items.map((b) => (
                <div key={b.id} className="bg-stone-900/60 border border-stone-800 rounded-xl p-3">
                  <div className="text-xs uppercase tracking-wide text-stone-400 mb-1">{b.kind}</div>
                  <div className="text-white font-medium">{b.title}</div>
                  <div className="text-stone-300 text-sm mt-1">{b.content}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-stone-900">
          <button onClick={onClear} className="w-full bg-red-900/20 hover:bg-red-900/30 border border-red-800 text-red-400 rounded-xl px-4 py-2 text-sm transition-colors">
            Clear All Items
          </button>
        </div>
      </div>
    </div>
  );
}