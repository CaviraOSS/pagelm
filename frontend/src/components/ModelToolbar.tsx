type Props = {
  stagedFileName?: string | null;
  onPickFile: () => void;
};

export default function ModelToolbar({ stagedFileName, onPickFile }: Props) {
  return (
    <div className="w-fit min-w-fit p-1.5 rounded-2xl rounded-t-none bg-stone-950 flex flex-col sm:flex-row items-start sm:items-center border border-stone-900 border-t-0 border-r-0 border-b-0 sm:border-b shadow-[inset_2px_-2px_15px] shadow-stone-900/80">
      <div className="md:flex items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 p-1.5">
        <div className="flex items-center space-x-4 p-1.5 hover:bg-white/5 duration-300 transition-all cursor-pointer rounded-xl min-w-fit h-fit">
          <div className="flex flex-col -space-y-0.5">
            <span className="text-xs">Model</span>
            <span className="text-sm font-semibold">Gemini-2.5 Pro</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>

        <div className="w-px h-8 mx-2 bg-white/10 rounded-full hidden sm:block" />

        <div className="p-1.5 md:h-full hover:bg-white/5 rounded-xl flex items-center space-x-2 cursor-pointer min-w-fit h-fit" onClick={onPickFile} title={stagedFileName || "Click or drop"}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-9 bg-white/5 rounded-full p-2">
            <path fillRule="evenodd" d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765 4.5 4.5 0 0 1 8.302-3.046 3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z" clipRule="evenodd" />
          </svg>
          <div className="flex flex-col -space-y-0.5">
            <span className="text-xs">{stagedFileName ? "File selected" : "Add files"}</span>
            <span className="text-sm">{stagedFileName || "Click or drop"}</span>
          </div>
        </div>

        <div className="w-px h-8 mx-2 bg-white/10 rounded-full hidden sm:block" />

        <div className="flex items-center space-x-4 p-1.5 hover:bg-white/5 duration-300 transition-all cursor-pointer rounded-xl w-full sm:w-auto">
          <div className="flex flex-col -space-y-0.5 pr-2">
            <span className="text-xs">Difficulty</span>
            <span className="text-sm font-semibold">Intermediate</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}