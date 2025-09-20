import { ToolIO } from "../types"
import { generateSectionItems } from "../../services/examlab/generator"
import crypto from "crypto"

export const examTool: ToolIO = {
  name: "exam.generate",
  desc: "exam section generator; input: { type:'mcq'|'short', count?: number, style?: string, difficulty?: string, topic?: string, prompt: string }",
  schema: {},
  run: async (i: any) => {
    const seed = crypto.randomBytes(8).toString("hex")
    const out = await generateSectionItems(i, seed)
    return out
  },
}