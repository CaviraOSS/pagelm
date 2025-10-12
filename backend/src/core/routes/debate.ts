import {
    createDebateSession,
    getDebateSession,
    streamDebateResponse,
    streamDebateAnalysis,
    listDebateSessions,
    deleteDebateSession,
    surrenderDebate,
    analyzeDebate,
    DebateSession,
} from "../../services/debate";

const debateSockets = new Map<string, Set<any>>();
const analysisSockets = new Map<string, Set<any>>();

export function debateRoutes(app: any) {
    app.ws("/ws/debate", (ws: any, req: any) => {
        const url = new URL(req.url, "http://localhost");
        const debateId = url.searchParams.get("debateId");
        if (!debateId) {
            return ws.close(1008, "debateId required");
        }

        let set = debateSockets.get(debateId);
        if (!set) {
            set = new Set();
            debateSockets.set(debateId, set);
        }
        set.add(ws);

        ws.on("close", () => {
            set!.delete(ws);
            if (set!.size === 0) debateSockets.delete(debateId);
        });

        ws.send(JSON.stringify({ type: "ready", debateId }));
    });

    app.ws("/ws/debate/analyze", (ws: any, req: any) => {
        const url = new URL(req.url, "http://localhost");
        const debateId = url.searchParams.get("debateId");
        if (!debateId) {
            return ws.close(1008, "debateId required");
        }

        let set = analysisSockets.get(debateId);
        if (!set) {
            set = new Set();
            analysisSockets.set(debateId, set);
        }
        set.add(ws);

        ws.on("close", () => {
            set!.delete(ws);
            if (set!.size === 0) analysisSockets.delete(debateId);
        });

        ws.send(JSON.stringify({ type: "ready", debateId }));
    });

    app.post("/debate/start", async (req: any, res: any) => {
        try {
            const { topic, position } = req.body;

            if (!topic || !topic.trim()) {
                return res.status(400).json({
                    ok: false,
                    error: "Topic is required",
                });
            }

            if (!position || !["for", "against"].includes(position)) {
                return res.status(400).json({
                    ok: false,
                    error: "Position must be 'for' or 'against'",
                });
            }

            const session = await createDebateSession(topic.trim(), position);

            res.json({
                ok: true,
                debateId: session.id,
                session: {
                    id: session.id,
                    topic: session.topic,
                    position: session.position,
                    createdAt: session.createdAt,
                },
                stream: `/ws/debate?debateId=${session.id}`,
            });
        } catch (error: any) {
            console.error("Error starting debate:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to start debate",
            });
        }
    });

    app.post("/debate/:debateId/argue", async (req: any, res: any) => {
        try {
            const { debateId } = req.params;
            const { argument } = req.body;

            if (!argument || !argument.trim()) {
                return res.status(400).json({
                    ok: false,
                    error: "Argument is required",
                });
            }

            const session = await getDebateSession(debateId);
            if (!session) {
                return res.status(404).json({
                    ok: false,
                    error: "Debate session not found",
                });
            }

            res.status(202).json({
                ok: true,
                message: "Argument received, streaming response",
            });

            const sockets = debateSockets.get(debateId);
            if (!sockets || sockets.size === 0) {
                console.warn(`No active WebSocket connections for debate ${debateId}`);
                return;
            }

            const emitToDebate = (data: any) => {
                sockets.forEach((ws) => {
                    try {
                        ws.send(JSON.stringify(data));
                    } catch (err) {
                        console.error("Error sending to WebSocket:", err);
                    }
                });
            };

            emitToDebate({ type: "user_argument", content: argument.trim() });
            emitToDebate({ type: "ai_thinking" });

            try {
                let fullResponse = "";
                for await (const token of streamDebateResponse(
                    debateId,
                    argument.trim()
                )) {
                    // Check if AI is conceding
                    if (typeof token === "object" && token.type === "concede") {
                        emitToDebate({
                            type: "ai_concede",
                            reason: token.reason
                        });
                        return;
                    }

                    fullResponse += token;
                    emitToDebate({ type: "ai_token", token });
                }

                emitToDebate({ type: "ai_complete", content: fullResponse });
            } catch (error: any) {
                console.error("Error streaming debate response:", error);
                emitToDebate({
                    type: "error",
                    error: error.message || "Failed to generate response",
                });
            }
        } catch (error: any) {
            console.error("Error in debate argue:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to process argument",
            });
        }
    });

    app.get("/debate/:debateId", async (req: any, res: any) => {
        try {
            const { debateId } = req.params;
            const session = await getDebateSession(debateId);

            if (!session) {
                return res.status(404).json({
                    ok: false,
                    error: "Debate session not found",
                });
            }

            res.json({
                ok: true,
                session,
            });
        } catch (error: any) {
            console.error("Error getting debate:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to get debate",
            });
        }
    });

    app.get("/debates", async (req: any, res: any) => {
        try {
            const sessions = await listDebateSessions();
            res.json({
                ok: true,
                debates: sessions.map((s) => ({
                    id: s.id,
                    topic: s.topic,
                    position: s.position,
                    messageCount: s.messages.length,
                    createdAt: s.createdAt,
                })),
            });
        } catch (error: any) {
            console.error("Error listing debates:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to list debates",
            });
        }
    });

    app.delete("/debate/:debateId", async (req: any, res: any) => {
        try {
            const { debateId } = req.params;
            const deleted = await deleteDebateSession(debateId);

            if (!deleted) {
                return res.status(404).json({
                    ok: false,
                    error: "Debate session not found",
                });
            }

            res.json({
                ok: true,
                message: "Debate session deleted",
            });
        } catch (error: any) {
            console.error("Error deleting debate:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to delete debate",
            });
        }
    });

    app.post("/debate/:debateId/surrender", async (req: any, res: any) => {
        try {
            const { debateId } = req.params;
            const session = await getDebateSession(debateId);

            if (!session) {
                return res.status(404).json({
                    ok: false,
                    error: "Debate session not found",
                });
            }

            await surrenderDebate(debateId);

            res.json({
                ok: true,
                message: "Debate surrendered",
            });
        } catch (error: any) {
            console.error("Error surrendering debate:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to surrender debate",
            });
        }
    });

    app.post("/debate/:debateId/analyze", async (req: any, res: any) => {
        try {
            const { debateId } = req.params;
            const session = await getDebateSession(debateId);

            if (!session) {
                return res.status(404).json({
                    ok: false,
                    error: "Debate session not found",
                });
            }

            console.log("[Debate Routes] Starting analysis for:", debateId);

            // Send immediate response, actual analysis happens via WebSocket
            res.status(202).json({
                ok: true,
                message: "Analysis started",
                stream: `/ws/debate/analyze?debateId=${debateId}`,
            });

            // Stream analysis via WebSocket
            const sockets = analysisSockets.get(debateId);
            if (!sockets || sockets.size === 0) {
                console.warn(`No active analysis WebSocket connections for debate ${debateId}`);
                return;
            }

            const emitToAnalysis = (data: any) => {
                sockets.forEach((ws) => {
                    try {
                        ws.send(JSON.stringify(data));
                    } catch (err) {
                        console.error("Error sending to analysis WebSocket:", err);
                    }
                });
            };

            try {
                for await (const event of streamDebateAnalysis(debateId)) {
                    if (event.type === "phase") {
                        emitToAnalysis({ type: "phase", value: event.value });
                    } else if (event.type === "analysis") {
                        emitToAnalysis({
                            type: "complete",
                            analysis: event.data,
                            session: {
                                ...session,
                                winner: event.data.winner,
                                status: session.status || "completed",
                            }
                        });
                    }
                }
            } catch (error: any) {
                console.error("Error streaming analysis:", error);
                emitToAnalysis({
                    type: "error",
                    error: error.message || "Failed to analyze debate",
                });
            }
        } catch (error: any) {
            console.error("Error analyzing debate:", error);
            res.status(500).json({
                ok: false,
                error: error.message || "Failed to analyze debate",
            });
        }
    });
}
