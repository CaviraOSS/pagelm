import { ToolIO, Ctx } from "../types"
import { handleSmartNotes } from "../../services/smartnotes"

export const notesTool: ToolIO = {
  name: "notes.cornell",
  desc: "generate Cornell notes to PDF; input: { topic?: string, notes?: string, filePath?: string }",
  schema: {},
  run: async (i: any, c: Ctx) => {
    const out = await handleSmartNotes(i)
    return out
  },
}