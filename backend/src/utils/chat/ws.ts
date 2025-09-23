import zlib from "zlib"

export function emitToAll(set: Set<any> | undefined, payload: any) {
  if (!set || set.size === 0) return
  let msg: string
  try {
    msg = typeof payload === "string" ? payload : JSON.stringify(payload)
  } catch (e) {
    console.error("[emitToAll] stringify failed", e)
    return
  }
  for (const ws of set) {
    if (!ws || ws.readyState !== 1) continue
    try {
      ws.send(msg)
    } catch (err) {
      console.warn("[emitToAll] ws.send failed:", err)
    }
  }
}

async function safeSend(ws: any, data: string, hi = 512 * 1024) {
  if (!ws || ws.readyState !== 1) return
  while (ws.bufferedAmount && ws.bufferedAmount > hi) {
    await new Promise(r => setTimeout(r, 10))
  }
  await new Promise<void>((resolve) => {
    try { ws.send(data, () => resolve()) } catch { resolve() }
  })
}

export async function emitLarge(
  set: Set<any> | undefined,
  type: string,
  payload: any,
  opts?: { id?: string; chunkBytes?: number; gzip?: boolean }
) {
  if (!set || set.size === 0) return

  const chunkBytes = Math.max(16 * 1024, Math.min(opts?.chunkBytes ?? 128 * 1024, 1024 * 1024))
  const id = opts?.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload)

  let dataStr = raw
  let encoding: "plain" | "gzip-base64" = "plain"
  if (opts?.gzip) {
    try {
      const gz = zlib.gzipSync(Buffer.from(raw, "utf8"))
      dataStr = gz.toString("base64")
      encoding = "gzip-base64"
    } catch (e) {
      console.warn("[emitLarge] gzip failed, falling back to plain:", e)
    }
  }

  const total = Math.ceil(dataStr.length / chunkBytes)
  let idx = 0
  const sockets = Array.from(set).filter(ws => ws && ws.readyState === 1)
  if (sockets.length === 0) return

  while (idx < total) {
    const start = idx * chunkBytes
    const end = start + chunkBytes
    const part = dataStr.slice(start, end)
    const more = idx + 1 < total
    const envelope = JSON.stringify({
      type: `${type}.chunk`,
      id,
      idx,
      total,
      more,
      encoding,
      data: part
    })
    await Promise.all(sockets.map(ws => safeSend(ws, envelope)))
    idx++
  }

  const doneMsg = JSON.stringify({ type: `${type}.done`, id, total })
  await Promise.all(sockets.map(ws => safeSend(ws, doneMsg)))
}