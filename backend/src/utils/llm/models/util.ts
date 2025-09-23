import type { Msg } from './types'

export const wrapChat = (m: any) => ({
  invoke: (ms: Msg[]) => m.invoke(ms),
  call: (ms: Msg[]) => m.invoke(ms),
})