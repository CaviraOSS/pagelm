import { ToolIO } from "../types"
export const nopTool: ToolIO = {
  name: "nop",
  desc: "no operation",
  schema: {},
  run: async () => ({ ok: true })
}