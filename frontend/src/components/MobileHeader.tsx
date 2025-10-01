export default function MobileHeader() {
  return (
    <header className="lg:hidden bg-stone-950 border border-stone-900 rounded-2xl p-4 mb-6 mt-4 flex items-center justify-between">
      <img src="/assets/logo.png" alt="logo" className="w-8 h-auto rounded-full" />
      <h2 className="text-xl font-semibold text-white">PageLM</h2>
      <button className="p-2 hover:bg-stone-900 rounded-xl duration-300 transition-all" aria-label="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
    </header>
  );
}