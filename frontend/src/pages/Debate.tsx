import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type DebateMessage = {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
};

type DebateSession = {
    id: string;
    topic: string;
    position: "for" | "against";
    messages: DebateMessage[];
    createdAt: number;
    status?: "active" | "user_surrendered" | "ai_conceded" | "completed";
    winner?: "user" | "ai" | "draw";
};

type DebateAnalysis = {
    winner: "user" | "ai" | "draw";
    reason: string;
    userStrengths: string[];
    aiStrengths: string[];
    userWeaknesses: string[];
    aiWeaknesses: string[];
    keyMoments: string[];
    overallAssessment: string;
};

export default function Debate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [topic, setTopic] = useState("");
    const [position, setPosition] = useState<"for" | "against">("for");
    const [debateId, setDebateId] = useState<string | null>(
        searchParams.get("debateId")
    );
    const [session, setSession] = useState<DebateSession | null>(null);
    const [messages, setMessages] = useState<DebateMessage[]>([]);
    const [argument, setArgument] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isDebateEnded, setIsDebateEnded] = useState(false);
    const [analysis, setAnalysis] = useState<DebateAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const analysisWsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [analysisPhase, setAnalysisPhase] = useState<string>("");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    useEffect(() => {
        if (debateId) {
            fetchDebateSession(debateId);
            connectWebSocket(debateId);
        }
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (analysisWsRef.current) {
                analysisWsRef.current.close();
            }
        };
    }, [debateId]);

    const fetchDebateSession = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:5000/debate/${id}`);
            const data = await response.json();
            if (data.ok) {
                setSession(data.session);
                setMessages(data.session.messages);
            } else {
                setError(data.error || "Failed to load debate session");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load debate session");
        }
    };

    const connectWebSocket = (id: string) => {
        const ws = new WebSocket(`ws://localhost:5000/ws/debate?debateId=${id}`);

        ws.onopen = () => {
            console.log("WebSocket connected");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "ready":
                    console.log("Debate WebSocket ready");
                    break;

                case "user_argument":
                    setMessages((prev) => [
                        ...prev,
                        { role: "user", content: data.content, timestamp: Date.now() },
                    ]);
                    break;

                case "ai_thinking":
                    setIsStreaming(true);
                    setStreamingContent("");
                    break;

                case "ai_token":
                    setStreamingContent((prev) => prev + data.token);
                    break;

                case "ai_complete":
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: data.content, timestamp: Date.now() },
                    ]);
                    setIsStreaming(false);
                    setStreamingContent("");
                    break;

                case "ai_concede":
                    setMessages((prev) => [
                        ...prev,
                        { role: "assistant", content: `I must concede this debate. ${data.reason}`, timestamp: Date.now() },
                    ]);
                    setIsStreaming(false);
                    setStreamingContent("");
                    setIsDebateEnded(true);
                    // Automatically fetch analysis
                    setTimeout(() => fetchAnalysis(), 1000);
                    break;

                case "error":
                    setError(data.error);
                    setIsStreaming(false);
                    setStreamingContent("");
                    break;
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            setError("Connection error");
        };

        ws.onclose = () => {
            console.log("WebSocket closed");
        };

        wsRef.current = ws;
    };

    const startDebate = async () => {
        if (!topic.trim()) return;

        try {
            const response = await fetch("http://localhost:5000/debate/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic: topic.trim(), position }),
            });

            const data = await response.json();
            if (data.ok) {
                setDebateId(data.debateId);
                setSession(data.session);
                setMessages([]);
                navigate(`/debate?debateId=${data.debateId}`);
            } else {
                setError(data.error || "Failed to start debate");
            }
        } catch (err: any) {
            setError(err.message || "Failed to start debate");
        }
    };

    const submitArgument = async () => {
        if (!argument.trim() || !debateId || isStreaming) return;

        const userArgument = argument.trim();
        setArgument("");

        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        try {
            const response = await fetch(
                `http://localhost:5000/debate/${debateId}/argue`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ argument: userArgument }),
                }
            );

            const data = await response.json();
            if (!data.ok) {
                setError(data.error || "Failed to submit argument");
            }
        } catch (err: any) {
            setError(err.message || "Failed to submit argument");
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setArgument(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitArgument();
        }
    };

    const handleSurrender = async () => {
        if (!debateId || isDebateEnded) return;

        if (!confirm("Are you sure you want to surrender this debate?")) return;

        try {
            const response = await fetch(
                `http://localhost:5000/debate/${debateId}/surrender`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            );

            const data = await response.json();
            if (data.ok) {
                setIsDebateEnded(true);
                fetchAnalysis();
            } else {
                setError(data.error || "Failed to surrender");
            }
        } catch (err: any) {
            setError(err.message || "Failed to surrender");
        }
    };

    const fetchAnalysis = async () => {
        if (!debateId) return;

        setIsAnalyzing(true);
        setAnalysisPhase("Starting analysis...");

        // Connect to analysis WebSocket first
        const analysisWs = new WebSocket(`ws://localhost:5000/ws/debate/analyze?debateId=${debateId}`);

        analysisWs.onopen = () => {
            console.log("Analysis WebSocket connected");
        };

        analysisWs.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "ready":
                    console.log("Analysis WebSocket ready");
                    break;

                case "phase":
                    setAnalysisPhase(data.value);
                    break;

                case "complete":
                    setAnalysis(data.analysis);
                    setSession(data.session);
                    setIsAnalyzing(false);
                    setAnalysisPhase("");
                    analysisWs.close();
                    break;

                case "error":
                    setError(data.error);
                    setIsAnalyzing(false);
                    setAnalysisPhase("");
                    analysisWs.close();
                    break;
            }
        };

        analysisWs.onerror = (error) => {
            console.error("Analysis WebSocket error:", error);
            setError("Analysis connection error");
            setIsAnalyzing(false);
            setAnalysisPhase("");
        };

        analysisWs.onclose = () => {
            console.log("Analysis WebSocket closed");
        };

        analysisWsRef.current = analysisWs;

        // Trigger analysis on backend
        try {
            const response = await fetch(
                `http://localhost:5000/debate/${debateId}/analyze`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                }
            );

            const data = await response.json();
            if (!data.ok && data.error) {
                setError(data.error);
                setIsAnalyzing(false);
                setAnalysisPhase("");
                analysisWs.close();
            }
        } catch (err: any) {
            setError(err.message || "Failed to start analysis");
            setIsAnalyzing(false);
            setAnalysisPhase("");
            analysisWs.close();
        }
    };

    if (!debateId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 lg:pl-28 lg:pr-4 bg-black">
                <div className="max-w-2xl w-full space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white">
                            Start a Debate
                        </h1>
                        <p className="text-lg text-stone-400">
                            Challenge AI in a structured debate on any topic
                        </p>
                    </div>

                    <div className="bg-stone-950/90 backdrop-blur-sm border border-stone-900 rounded-2xl p-8 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Debate Topic
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., boons and banes of AI in education"
                                className="w-full px-4 py-3 bg-stone-900/70 border border-zinc-800 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                onKeyDown={(e) => e.key === "Enter" && startDebate()}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-3">
                                Your Position
                            </label>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setPosition("for")}
                                    className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${position === "for"
                                        ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                                        : "bg-stone-900/70 border border-zinc-800 text-stone-400 hover:bg-stone-800"
                                        }`}
                                >
                                    <div className="text-2xl mb-1">👍</div>
                                    <div>For</div>
                                    <div className="text-xs mt-1 opacity-80">Support the topic</div>
                                </button>
                                <button
                                    onClick={() => setPosition("against")}
                                    className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all ${position === "against"
                                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                                        : "bg-stone-900/70 border border-zinc-800 text-stone-400 hover:bg-stone-800"
                                        }`}
                                >
                                    <div className="text-2xl mb-1">👎</div>
                                    <div>Against</div>
                                    <div className="text-xs mt-1 opacity-80">Oppose the topic</div>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={startDebate}
                            disabled={!topic.trim()}
                            className="w-full py-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:from-stone-800 disabled:to-stone-800 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg"
                        >
                            Begin Debate
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full lg:pl-28 bg-black">
            <div className="flex-shrink-0 border-b border-zinc-900 bg-stone-950/90 backdrop-blur-sm">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-white mb-1">
                                {session?.topic || "Debate"}
                            </h1>
                            <div className="flex items-center gap-3 text-sm">
                                <span
                                    className={`px-3 py-1 rounded-full font-semibold ${session?.position === "for"
                                        ? "bg-green-600/20 text-green-400 border border-green-600/30"
                                        : "bg-red-600/20 text-red-400 border border-red-600/30"
                                        }`}
                                >
                                    You: {session?.position === "for" ? "For" : "Against"}
                                </span>
                                <span className="text-stone-500">vs</span>
                                <span className="px-3 py-1 rounded-full font-semibold bg-purple-600/20 text-purple-400 border border-purple-600/30">
                                    AI: {session?.position === "for" ? "Against" : "For"}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setDebateId(null);
                                setSession(null);
                                setMessages([]);
                                navigate("/debate");
                            }}
                            className="px-4 py-2 bg-stone-900/70 border border-zinc-800 hover:bg-stone-800 text-stone-300 rounded-lg transition-colors"
                        >
                            New Debate
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scroll">
                {messages.length === 0 && !isStreaming && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4 max-w-md">
                            <div className="text-6xl animate-[fadeIn_0.5s_ease-in-out]">⚖️</div>
                            <h2 className="text-2xl font-bold text-white animate-[fadeIn_0.6s_ease-in-out]">
                                Ready to debate!
                            </h2>
                            <p className="text-stone-400 animate-[fadeIn_0.7s_ease-in-out]">
                                Present your opening argument below. The AI will respond with a
                                counterargument.
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end animate-[slideInRight_0.3s_ease-out]" : "justify-start animate-[slideInLeft_0.3s_ease-out]"}`}
                    >
                        <div
                            className={`max-w-3xl ${msg.role === "user" ? "items-end" : "items-start"
                                } flex flex-col gap-2`}
                        >
                            <div className="flex items-center gap-2">
                                {msg.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold shadow-lg">
                                        AI
                                    </div>
                                )}
                                <span className="text-sm font-semibold text-stone-400">
                                    {msg.role === "user" ? "You" : "AI Opponent"}
                                </span>
                                {msg.role === "user" && (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${session?.position === "for"
                                        ? "bg-gradient-to-br from-green-600 to-green-700"
                                        : "bg-gradient-to-br from-red-600 to-red-700"
                                        }`}>
                                        U
                                    </div>
                                )}
                            </div>
                            <div
                                className={`px-6 py-4 rounded-2xl shadow-lg transition-all hover:shadow-xl ${msg.role === "user"
                                    ? session?.position === "for"
                                        ? "bg-gradient-to-br from-green-600 to-green-700 text-white shadow-green-600/20"
                                        : "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-red-600/20"
                                    : "bg-stone-950/90 border border-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/10 backdrop-blur text-white"
                                    }`}
                            >
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    </div>
                ))}

                {isStreaming && (
                    <div className="flex justify-start animate-[slideInLeft_0.3s_ease-out]">
                        <div className="max-w-3xl items-start flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-bold shadow-lg">
                                    AI
                                </div>
                                <span className="text-sm font-semibold text-stone-400">
                                    AI Opponent
                                </span>
                            </div>
                            <div className="px-6 py-4 rounded-2xl shadow-lg bg-stone-950/90 border border-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-black/10 backdrop-blur text-white">
                                <p className="whitespace-pre-wrap leading-relaxed">
                                    {streamingContent}
                                    <span className="inline-block w-2 h-5 bg-gradient-to-r from-purple-500 to-purple-600 ml-1 animate-pulse rounded-sm" />
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 border-t border-zinc-900 bg-stone-950/90 backdrop-blur-sm p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex gap-3 mb-3">
                        <textarea
                            ref={textareaRef}
                            value={argument}
                            onChange={handleTextareaChange}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                isDebateEnded
                                    ? "Debate has ended"
                                    : isStreaming
                                        ? "AI is responding..."
                                        : "Type your argument... (Shift+Enter for new line)"
                            }
                            disabled={isStreaming || isDebateEnded}
                            className="flex-1 px-4 py-3 bg-stone-900/70 border border-zinc-800 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed custom-scroll"
                            rows={1}
                            style={{ minHeight: "50px", maxHeight: "200px" }}
                        />
                        <button
                            onClick={submitArgument}
                            disabled={!argument.trim() || isStreaming || isDebateEnded}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${session?.position === "for"
                                ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-green-600/20"
                                : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-600/20"
                                }`}
                        >
                            {isStreaming ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Waiting...</span>
                                </div>
                            ) : (
                                "Argue"
                            )}
                        </button>
                    </div>
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handleSurrender}
                            disabled={isStreaming || messages.length === 0 || isDebateEnded}
                            className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/40 hover:border-orange-600/60 text-orange-400 hover:text-orange-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                        >
                            🏳️ Surrender
                        </button>
                    </div>
                </div>
            </div>

            {isDebateEnded && analysis && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.3s_ease-in-out]">
                    <div className="bg-stone-950 border border-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scroll shadow-2xl animate-[scaleIn_0.3s_ease-out]">
                        <div className="p-8 space-y-6">
                            {/* Header */}
                            <div className="text-center space-y-4">
                                <div className="text-6xl">
                                    {analysis.winner === "user" ? "🏆" : analysis.winner === "ai" ? "🤖" : "🤝"}
                                </div>
                                <h2 className="text-3xl font-bold text-white">
                                    {analysis.winner === "user"
                                        ? "You Won!"
                                        : analysis.winner === "ai"
                                            ? "AI Won!"
                                            : "It's a Draw!"}
                                </h2>
                                <p className="text-lg text-stone-400">{analysis.reason}</p>
                            </div>

                            {/* Overall Assessment */}
                            <div className="bg-stone-900/50 border border-zinc-800 rounded-xl p-6">
                                <h3 className="text-xl font-bold text-white mb-3">📊 Overall Assessment</h3>
                                <p className="text-stone-300 leading-relaxed">{analysis.overallAssessment}</p>
                            </div>

                            {/* Two Column Layout for Strengths/Weaknesses */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* User Performance */}
                                <div className="space-y-4">
                                    <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-5">
                                        <h3 className="text-lg font-bold text-green-400 mb-3">💪 Your Strengths</h3>
                                        <ul className="space-y-2">
                                            {analysis.userStrengths.map((strength, idx) => (
                                                <li key={idx} className="text-stone-300 text-sm flex items-start gap-2">
                                                    <span className="text-green-500 mt-0.5">✓</span>
                                                    <span>{strength}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {analysis.userWeaknesses.length > 0 && (
                                        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-5">
                                            <h3 className="text-lg font-bold text-red-400 mb-3">📉 Areas to Improve</h3>
                                            <ul className="space-y-2">
                                                {analysis.userWeaknesses.map((weakness, idx) => (
                                                    <li key={idx} className="text-stone-300 text-sm flex items-start gap-2">
                                                        <span className="text-red-500 mt-0.5">✗</span>
                                                        <span>{weakness}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* AI Performance */}
                                <div className="space-y-4">
                                    <div className="bg-purple-900/20 border border-purple-800/30 rounded-xl p-5">
                                        <h3 className="text-lg font-bold text-purple-400 mb-3">🤖 AI Strengths</h3>
                                        <ul className="space-y-2">
                                            {analysis.aiStrengths.map((strength, idx) => (
                                                <li key={idx} className="text-stone-300 text-sm flex items-start gap-2">
                                                    <span className="text-purple-500 mt-0.5">✓</span>
                                                    <span>{strength}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {analysis.aiWeaknesses.length > 0 && (
                                        <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-5">
                                            <h3 className="text-lg font-bold text-red-400 mb-3">📉 AI Weaknesses</h3>
                                            <ul className="space-y-2">
                                                {analysis.aiWeaknesses.map((weakness, idx) => (
                                                    <li key={idx} className="text-stone-300 text-sm flex items-start gap-2">
                                                        <span className="text-red-500 mt-0.5">✗</span>
                                                        <span>{weakness}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Key Moments */}
                            {analysis.keyMoments.length > 0 && (
                                <div className="bg-stone-900/50 border border-zinc-800 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-white mb-4">⚡ Key Moments</h3>
                                    <ul className="space-y-3">
                                        {analysis.keyMoments.map((moment, idx) => (
                                            <li key={idx} className="text-stone-300 flex items-start gap-3">
                                                <span className="text-sky-500 font-bold text-sm mt-0.5">{idx + 1}.</span>
                                                <span>{moment}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        setDebateId(null);
                                        setSession(null);
                                        setMessages([]);
                                        setIsDebateEnded(false);
                                        setAnalysis(null);
                                        navigate("/debate");
                                    }}
                                    className="flex-1 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg"
                                >
                                    New Debate
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDebateEnded(false);
                                        setAnalysis(null);
                                    }}
                                    className="px-6 py-3 bg-stone-900/70 border border-zinc-800 hover:bg-stone-800 text-stone-300 font-semibold rounded-xl transition-colors"
                                >
                                    Review Debate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAnalyzing && !analysis && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-stone-950 border border-zinc-900 rounded-2xl p-8 text-center space-y-4 min-w-[300px]">
                        <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-white font-semibold">Analyzing debate...</p>
                        {analysisPhase && (
                            <p className="text-sky-400 text-sm animate-pulse">{analysisPhase}</p>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="fixed bottom-20 right-6 bg-red-900/90 border border-red-700 rounded-xl p-4 text-red-200 shadow-lg max-w-md">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">⚠️</span>
                        <div className="flex-1">{error}</div>
                        <button
                            onClick={() => setError(null)}
                            className="text-red-400 hover:text-red-200"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
