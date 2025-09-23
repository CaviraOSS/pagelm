export function emitToAll(set: Set<any> | undefined, payload: any) {
  if (!set) return
  const msg = JSON.stringify(payload)
  for (const ws of set) if (ws.readyState === 1) ws.send(msg)
}   