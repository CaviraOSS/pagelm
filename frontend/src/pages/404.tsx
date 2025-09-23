import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 w-1 h-1 bg-white rounded-full animate-pulse opacity-80"></div>
        <div className="absolute top-16 right-12 w-0.5 h-0.5 bg-blue-200 rounded-full animate-twinkle opacity-60"></div>
        <div className="absolute top-24 left-1/3 w-1 h-1 bg-yellow-200 rounded-full animate-pulse opacity-70"></div>
        <div className="absolute top-40 right-1/4 w-0.5 h-0.5 bg-white rounded-full animate-twinkle opacity-50"></div>
        <div className="absolute top-48 left-20 w-1 h-1 bg-blue-100 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-60 right-8 w-0.5 h-0.5 bg-yellow-100 rounded-full animate-twinkle opacity-80"></div>
        <div className="absolute top-72 left-2/3 w-1 h-1 bg-white rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-20 left-8 w-0.5 h-0.5 bg-blue-200 rounded-full animate-twinkle opacity-70"></div>
        <div className="absolute bottom-32 right-16 w-1 h-1 bg-yellow-200 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute bottom-40 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-twinkle opacity-60"></div>
        <div className="absolute bottom-48 right-1/3 w-1 h-1 bg-blue-100 rounded-full animate-pulse opacity-80"></div>
        <div className="absolute bottom-60 left-3/4 w-0.5 h-0.5 bg-yellow-100 rounded-full animate-twinkle opacity-40"></div>
        <div className="absolute top-80 left-12 w-1 h-1 bg-white rounded-full animate-pulse opacity-90"></div>
        <div className="absolute top-96 right-24 w-0.5 h-0.5 bg-blue-200 rounded-full animate-twinkle opacity-70"></div>
        <div className="absolute bottom-80 right-12 w-1 h-1 bg-yellow-200 rounded-full animate-pulse opacity-60"></div>
        
        <div className="absolute top-20 left-10 w-2 h-2 bg-green-400 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-30"></div>
        <div className="absolute bottom-40 left-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce opacity-30"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-emerald-400 rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-1/3 right-10 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-20"></div>
      </div>
      
      <div className="text-center space-y-10 max-w-2xl relative z-10">
        <div className="relative">
          <div className="text-9xl font-thin text-gray-800 mb-2 relative">
            404
            <div className="absolute inset-0 text-9xl font-thin bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent opacity-30 blur-sm">
              404
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-60"></div>
        </div>
        
        <div className="space-y-6">
          <h2 className="text-3xl font-light text-gray-200 tracking-wide">
            Oops! Study session interrupted
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed font-light max-w-md mx-auto">
            The page you're looking for took a study break. Let's get you back to learning something amazing!
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-3 px-8 py-2.5 border border-green-500/40 rounded-full text-green-400 font-medium text-sm tracking-wide transition-all duration-500 hover:border-green-400 hover:text-white hover:shadow-lg hover:shadow-green-500/20 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:-translate-x-1 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="relative z-10">Back to Dashboard</span>
          </Link>
          
          <Link
            to="/chat"
            className="group relative inline-flex items-center gap-3 px-8 py-2.5 border border-blue-500/40 rounded-full text-blue-400 font-medium text-sm tracking-wide transition-all duration-500 hover:border-blue-400 hover:text-white hover:shadow-lg hover:shadow-blue-500/20 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="relative z-10">Chat</span>
          </Link>
          
          <Link
            to="/quiz"
            className="group relative inline-flex items-center gap-3 px-8 py-2.5 border border-purple-500/40 rounded-full text-purple-400 font-medium text-sm tracking-wide transition-all duration-500 hover:border-purple-400 hover:text-white hover:shadow-lg hover:shadow-purple-500/20 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="relative z-10">Take Quiz</span>
          </Link>
        </div>
        
        <div className="mt-16 opacity-60">
          <p className="text-gray-500 text-sm font-light italic tracking-wide">
            "Every mistake is a learning opportunity"
          </p>
        </div>
      </div>
      
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(34, 197, 94, 0.3) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-radial from-green-500/5 to-transparent rounded-full blur-3xl"></div>
      
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}