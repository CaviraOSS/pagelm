import { Link } from 'react-router-dom'
import Planner from "../components/planner/Planner"

export default function PlannerPage() {
    return (
        <div className="min-h-screen w-full lg:pl-28">
            <header className="flex items-center justify-between px-4 pt-4 z-10 relative">
                <div className="flex items-center gap-3">
                    <Link
                        to='/'
                        className="p-2 rounded-xl bg-stone-950 border border-stone-900 hover:bg-stone-900 transition-colors"
                        aria-label="Back"
                    >
                        <svg viewBox="0 0 24 24" className="size-5 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <h1 className="text-2xl font-semibold text-white flex items-center gap-3">Homework Planner</h1>
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-300 text-[10px] font-medium">BETA</span>
                </div>
            </header>

            <main className="px-4 py-4">
                <div className="mx-auto max-w-6xl">
                    <Planner />
                </div>
            </main>
        </div>
    )
}
