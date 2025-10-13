import llm from "../../utils/llm/llm";
import db from "../../utils/database/keyv";

export type DebateMessage = {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
};

export type DebateSession = {
    id: string;
    topic: string;
    position: "for" | "against";
    messages: DebateMessage[];
    createdAt: number;
    status?: "active" | "user_surrendered" | "ai_conceded" | "completed";
    winner?: "user" | "ai" | "draw";
};

export type DebateAnalysis = {
    winner: "user" | "ai" | "draw";
    reason: string;
    userStrengths: string[];
    aiStrengths: string[];
    userWeaknesses: string[];
    aiWeaknesses: string[];
    keyMoments: string[];
    overallAssessment: string;
};

const DEBATE_LIST_KEY = "debate:sessions";

async function getDebatesList(): Promise<{ id: string }[]> {
    return (await db.get(DEBATE_LIST_KEY)) || [];
}

function toText(out: any): string {
    if (!out) return "";
    if (typeof out === "string") return out;
    if (typeof out?.content === "string") return out.content;
    if (Array.isArray(out?.content))
        return out.content
            .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
            .join("");
    if (Array.isArray(out?.generations) && out.generations[0]?.text)
        return out.generations[0].text;
    return String(out ?? "");
}

export async function createDebateSession(topic: string, position: "for" | "against"): Promise<DebateSession> {
    const id = `debate_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const session: DebateSession = {
        id,
        topic,
        position,
        messages: [],
        createdAt: Date.now(),
    };

    const list = await getDebatesList();
    list.push({ id });
    await db.set(DEBATE_LIST_KEY, list);

    await db.set(`debate:session:${id}`, session);
    return session;
}

export async function getDebateSession(id: string): Promise<DebateSession | null> {
    const session = await db.get(`debate:session:${id}`);
    return session || null;
}

export async function addDebateMessage(
    sessionId: string,
    role: "user" | "assistant",
    content: string
): Promise<void> {
    const session = await getDebateSession(sessionId);
    if (session) {
        session.messages.push({
            role,
            content,
            timestamp: Date.now(),
        });
        await db.set(`debate:session:${sessionId}`, session);
    }
}

export async function* streamDebateResponse(
    sessionId: string,
    userArgument: string
): AsyncGenerator<string | { type: "concede"; reason: string }, void, unknown> {
    const session = await getDebateSession(sessionId);
    if (!session) {
        throw new Error("Debate session not found");
    }

    await addDebateMessage(sessionId, "user", userArgument);

    const opposingPosition = session.position === "for" ? "against" : "for";

    // Check if AI should concede (after 3+ exchanges, detect weak position)
    const shouldCheckConcede = session.messages.length >= 6; // 3+ exchanges

    const systemPrompt = `You are an expert debater participating in a formal debate about: "${session.topic}"

Your position: You are arguing ${opposingPosition.toUpperCase()} the topic.
User's position: They are arguing ${session.position.toUpperCase()} the topic.

${shouldCheckConcede ? `IMPORTANT: If you find that you have run out of strong arguments, or if the user has made overwhelmingly convincing points that you cannot reasonably counter, you MUST start your response with exactly "[CONCEDE]" followed by a brief explanation of why you are conceding. This shows intellectual honesty and good sportsmanship.

` : ""}Guidelines for your responses:
1. Present strong, logical arguments ${opposingPosition} the topic
2. Use evidence, examples, and reasoning to support your points
3. Address and counter the user's arguments directly
4. Be respectful but assertive in your debate style
5. Keep responses focused, concise, well-structured and short (1-2 paragraphs)
6. Use rhetorical techniques like ethos, pathos, and logos
7. Structure your arguments clearly with transitions
8. Challenge weak points in the user's reasoning
9. Anticipate counterarguments and preemptively address them
10. Be savage, competitive, persuiasive, assertive and to the point
11. Exceed the paragraphs limit if needed to make a strong argument
${shouldCheckConcede ? "12. If you genuinely cannot provide a strong counterargument, CONCEDE rather than making weak arguments\n" : ""}
Remember: You are in a debate, so be persuasive and competitive while remaining intellectually honest.`;

    const conversationHistory = session.messages
        .slice(-6)
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n\n");

    const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: `Previous exchanges:\n${conversationHistory}\n\nUser's latest argument:\n${userArgument}\n\nYour counter-argument (respond with a strong rebuttal${shouldCheckConcede ? ", or start with [CONCEDE] if you have no strong arguments left" : ""}):` }
    ];

    const response = await llm.call(messages);
    const fullResponse = toText(response).trim();

    if (fullResponse.startsWith("[CONCEDE]")) {
        const concedeReason = fullResponse.replace("[CONCEDE]", "").trim();
        session.status = "ai_conceded";
        session.winner = "user";
        await db.set(`debate:session:${sessionId}`, session);

        yield { type: "concede", reason: concedeReason };
        return;
    }

    const words = fullResponse.split(/(\s+)/);
    for (const word of words) {
        yield word;
        await new Promise(resolve => setTimeout(resolve, 30));
    }

    await addDebateMessage(sessionId, "assistant", fullResponse);
}

export async function listDebateSessions(): Promise<DebateSession[]> {
    const list = await getDebatesList();
    const sessions: DebateSession[] = [];

    for (const item of list) {
        const session = await getDebateSession(item.id);
        if (session) {
            sessions.push(session);
        }
    }

    return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDebateSession(id: string): Promise<boolean> {
    const list = await getDebatesList();
    const filteredList = list.filter(item => item.id !== id);
    await db.set(DEBATE_LIST_KEY, filteredList);

    // Delete session
    await db.delete(`debate:session:${id}`);
    return true;
}

export async function surrenderDebate(sessionId: string): Promise<void> {
    const session = await getDebateSession(sessionId);
    if (session) {
        session.status = "user_surrendered";
        session.winner = "ai";
        await db.set(`debate:session:${sessionId}`, session);
    }
}

export async function* streamDebateAnalysis(sessionId: string): AsyncGenerator<
    { type: "phase"; value: string } | { type: "analysis"; data: DebateAnalysis },
    void,
    unknown
> {
    const session = await getDebateSession(sessionId);
    if (!session) {
        throw new Error("Debate session not found");
    }

    yield { type: "phase", value: "Gathering debate data..." };

    const userMessages = session.messages.filter(m => m.role === "user").map(m => m.content);
    const aiMessages = session.messages.filter(m => m.role === "assistant").map(m => m.content);

    yield { type: "phase", value: "Analyzing arguments..." };

    const analysisPrompt = `You are an expert debate judge analyzing a completed debate on the topic: "${session.topic}"

User's position: ${session.position.toUpperCase()}
AI's position: ${session.position === "for" ? "AGAINST" : "FOR"}

${session.status === "user_surrendered" ? "NOTE: The user surrendered this debate.\n" : ""}${session.status === "ai_conceded" ? "NOTE: The AI conceded this debate due to lack of strong counterarguments.\n" : ""}
User's arguments:
${userMessages.map((msg, i) => `${i + 1}. ${msg}`).join("\n\n")}

AI's arguments:
${aiMessages.map((msg, i) => `${i + 1}. ${msg}`).join("\n\n")}

Provide a comprehensive analysis in this EXACT JSON format (no markdown, just JSON):
{
  "winner": "user",
  "reason": "Brief explanation of why this party won",
  "userStrengths": ["strength 1", "strength 2", "strength 3"],
  "aiStrengths": ["strength 1", "strength 2", "strength 3"],
  "userWeaknesses": ["weakness 1", "weakness 2"],
  "aiWeaknesses": ["weakness 1", "weakness 2"],
  "keyMoments": ["moment 1", "moment 2", "moment 3"],
  "overallAssessment": "A paragraph summarizing the debate quality and outcome"
}`;

    const messages = [
        { role: "system" as const, content: "You are an expert debate judge. Provide fair, balanced analysis. Respond with valid JSON only." },
        { role: "user" as const, content: analysisPrompt }
    ];

    try {
        yield { type: "phase", value: "Consulting AI judge..." };

        const response = await llm.call(messages);
        const analysisText = toText(response).trim();

        yield { type: "phase", value: "Processing results..." };

        let jsonText = analysisText;
        const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        }

        const analysis: DebateAnalysis = JSON.parse(jsonText);

        if (!session.winner) {
            session.winner = analysis.winner;
            session.status = "completed";
            await db.set(`debate:session:${sessionId}`, session);
        }

        yield { type: "analysis", data: analysis };
    } catch (error) {
        console.error("[Debate Analysis] Error:", error);

        yield { type: "phase", value: "Generating fallback analysis..." };

        const fallbackAnalysis: DebateAnalysis = {
            winner: session.winner || "draw",
            reason: session.winner === "user" ? "User presented stronger arguments" : session.winner === "ai" ? "AI presented stronger arguments" : "Both sides presented balanced arguments",
            userStrengths: ["Engaged in debate", "Presented arguments", "Maintained position"],
            aiStrengths: ["Provided counterarguments", "Challenged user's points", "Used logical reasoning"],
            userWeaknesses: [],
            aiWeaknesses: [],
            keyMoments: ["Opening arguments", "Key rebuttals", "Final exchanges"],
            overallAssessment: `The debate featured ${userMessages.length} exchanges with arguments from both sides. Due to technical limitations, a detailed analysis could not be completed, but both participants engaged meaningfully in the discussion.`
        };

        yield { type: "analysis", data: fallbackAnalysis };
    }
}

export async function analyzeDebate(sessionId: string): Promise<DebateAnalysis> {
    const session = await getDebateSession(sessionId);
    if (!session) {
        throw new Error("Debate session not found");
    }

    const userMessages = session.messages.filter(m => m.role === "user").map(m => m.content);
    const aiMessages = session.messages.filter(m => m.role === "assistant").map(m => m.content);

    console.log("[Debate Analysis] Starting analysis for session:", sessionId);

    const analysisPrompt = `You are an expert debate judge analyzing a completed debate on the topic: "${session.topic}"

User's position: ${session.position.toUpperCase()}
AI's position: ${session.position === "for" ? "AGAINST" : "FOR"}

${session.status === "user_surrendered" ? "NOTE: The user surrendered this debate.\n" : ""}${session.status === "ai_conceded" ? "NOTE: The AI conceded this debate due to lack of strong counterarguments.\n" : ""}
User's arguments:
${userMessages.map((msg, i) => `${i + 1}. ${msg}`).join("\n\n")}

AI's arguments:
${aiMessages.map((msg, i) => `${i + 1}. ${msg}`).join("\n\n")}

Provide a comprehensive analysis in this EXACT JSON format (no markdown, just JSON):
{
  "winner": "user",
  "reason": "Brief explanation of why this party won",
  "userStrengths": ["strength 1", "strength 2", "strength 3"],
  "aiStrengths": ["strength 1", "strength 2", "strength 3"],
  "userWeaknesses": ["weakness 1", "weakness 2"],
  "aiWeaknesses": ["weakness 1", "weakness 2"],
  "keyMoments": ["moment 1", "moment 2", "moment 3"],
  "overallAssessment": "A paragraph summarizing the debate quality and outcome"
}`;

    const messages = [
        { role: "system" as const, content: "You are an expert debate judge. Provide fair, balanced analysis. Respond with valid JSON only." },
        { role: "user" as const, content: analysisPrompt }
    ];

    try {
        console.log("[Debate Analysis] Calling LLM...");
        const response = await llm.call(messages);
        const analysisText = toText(response).trim();
        console.log("[Debate Analysis] LLM response received, length:", analysisText.length);

        let jsonText = analysisText;
        const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        }

        const analysis: DebateAnalysis = JSON.parse(jsonText);
        console.log("[Debate Analysis] Successfully parsed analysis");

        if (!session.winner) {
            session.winner = analysis.winner;
            session.status = "completed";
            await db.set(`debate:session:${sessionId}`, session);
        }

        return analysis;
    } catch (error) {
        console.error("[Debate Analysis] Error:", error);
        return {
            winner: session.winner || "draw",
            reason: session.winner === "user" ? "User presented stronger arguments" : session.winner === "ai" ? "AI presented stronger arguments" : "Both sides presented balanced arguments",
            userStrengths: ["Engaged in debate", "Presented arguments", "Maintained position"],
            aiStrengths: ["Provided counterarguments", "Challenged user's points", "Used logical reasoning"],
            userWeaknesses: [],
            aiWeaknesses: [],
            keyMoments: ["Opening arguments", "Key rebuttals", "Final exchanges"],
            overallAssessment: "The debate featured " + userMessages.length + " exchanges with arguments from both sides. Due to technical limitations, a detailed analysis could not be completed, but both participants engaged meaningfully in the discussion."
        };
    }
}
