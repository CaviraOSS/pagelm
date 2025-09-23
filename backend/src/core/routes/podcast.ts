import path from "path";
import { makeScript, makeAudio } from "../../services/podcast";
import { emitToAll } from "../../utils/chat/ws";
import { config } from "../../config/env";

const sockets = new Map<string, Set<any>>();

function emit(id: string, msg: any) {
  const s = sockets.get(id);
  emitToAll(s, msg);
}

export function podcastRoutes(app: any) {
  app.ws("/ws/podcast", (ws: any, req: any) => {
    const u = new URL(req.url, config.baseUrl || "http://dummy");
    const pid = u.searchParams.get("pid");
    if (!pid) return ws.close(1008, "pid required");
    let set = sockets.get(pid);
    if (!set) {
      set = new Set();
      sockets.set(pid, set);
    }
    set.add(ws);
    ws.on("close", () => {
      set!.delete(ws);
      if (set!.size === 0) sockets.delete(pid);
    });
    ws.send(JSON.stringify({ type: "ready", pid }));
  });

  app.post("/podcast", async (req: any, res: any, next: any) => {
    try {
      const topic = String(req.body?.topic || req.body?.title || "").trim();
      if (!topic) return res.status(400).send({ error: "topic required" });

      const pid = cryptoRandom();
      const dir = path.join(process.cwd(), "storage", "podcasts", pid);
      const base = topic.replace(/[^a-z0-9]/gi, "_").slice(0, 50) || "podcast";

      res.status(202).send({ ok: true, pid, stream: `/ws/podcast?pid=${pid}` });
      (async () => {
        try {
          emit(pid, { type: "phase", value: "script" });
          const script = await makeScript(topic, topic);
          emit(pid, { type: "script", data: script });
          emit(pid, { type: "phase", value: "audio" });
          const outPath = await makeAudio(script, dir, base, (m) =>
            emit(pid, m)
          );
          emit(pid, {
            type: "audio",
            file: outPath.replace(process.cwd(), ""),
          });
          emit(pid, { type: "done" });
        } catch (e: any) {
          emit(pid, { type: "error", error: e?.message || "failed" });
        }
      })();
    } catch (e) {
      next(e);
    }
  });
}

function cryptoRandom() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
