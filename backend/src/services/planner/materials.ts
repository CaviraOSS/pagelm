import { handleAsk } from "../../lib/ai/ask"

export async function generateMaterials(topic: string, kind: "summary" | "studyGuide" | "flashcards" | "quiz") {
    const p = await handleAsk(topic)
    if (kind === "flashcards") return { flashcards: p.flashcards }
    if (kind === "summary" || kind === "studyGuide") return { topic: p.topic, answer: p.answer }
    if (kind === "quiz") return { quiz: p.flashcards.map((c, i) => ({ id: i + 1, q: c.q, a: c.a })) }
    return { topic: p.topic }
}
