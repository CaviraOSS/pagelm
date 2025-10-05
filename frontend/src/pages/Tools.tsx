import { Link } from 'react-router-dom'
import SmartNotes from "../components/Tools/SmartNotes"
import PodcastGenerator from "../components/Tools/PodcastGenerator"
import Transcriber from "../components/Tools/Transcriber"
import ComingSoon from "../components/Tools/ComingSoon"

export default function Tools() {
  return (
    <div className="min-h-screen w-full px-4 lg:pl-28 lg:pr-4">
      <div className="max-w-6xl mx-auto pt-6 px-4 pb-14">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to='/'
              className="p-2 rounded-xl bg-stone-950 border border-zinc-800 hover:bg-stone-900 transition-colors"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" className="size-5 text-stone-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">Tools</h1>
          </div>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500/30 text-sky-300 text-xs font-medium">
            BETA
          </div>
        </div>

        <div className="grid gap-6 mb-12">
          <SmartNotes />
          <PodcastGenerator />
          <Transcriber />
          <ComingSoon />
        </div>
      </div>
    </div>
  )
}