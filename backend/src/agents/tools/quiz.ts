import { ToolIO } from "../types"
import { handleQuiz } from "../../services/quiz"

export const quizTool: ToolIO = {
  name: "quiz.build",
  desc: "build 5 MCQs; input: { topic: string }",
  schema: {},
  run: async (i: { topic: string }) => {
    const out = await handleQuiz(i.topic)
    return out
  },
}