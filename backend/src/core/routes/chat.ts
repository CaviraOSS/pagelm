import { handleAsk } from "../../lib/ai/ask";
import { parseMultipart, handleUpload } from "../../lib/parser/upload";
import {
  mkChat,
  getChat,
  addMsg,
  listChats,
  getMsgs,
} from "../../utils/chat/chat";
import { emitToAll } from "../../utils/chat/ws";

type UpFile = { path: string; filename: string; mimeType: string };

const chatSockets = new Map<string, Set<any>>();

export function chatRoutes(app: any) {
  app.ws("/ws/chat", (ws: any, req: any) => {
    const url = new URL(req.url, "http://localhost");
    const chatId = url.searchParams.get("chatId");
    if (!chatId) {
      return ws.close(1008, "chatId required");
    }

    let set = chatSockets.get(chatId);
    if (!set) {
      set = new Set();
      chatSockets.set(chatId, set);
    }
    set.add(ws);

    ws.on("close", (code: number, reason: string) => {
      set!.delete(ws);
      if (set!.size === 0) chatSockets.delete(chatId);
    });

    ws.send(JSON.stringify({ type: "ready", chatId }));
  });

  app.post("/chat", async (req: any, res: any, next: any) => {
    const t0 = Date.now();
    try {
      const ct = String(req.headers["content-type"] || "");
      const isMp = ct.includes("multipart/form-data");

      let q = "";
      let chatId: string | undefined;
      let files: UpFile[] = [];

      if (isMp) {
        const tMp = Date.now();
        const { q: mq, chatId: mcid, files: mf } = await parseMultipart(req);
        q = mq;
        chatId = mcid;
        files = mf || [];
        if (!q)
          return res.status(400).send({ error: "q required for file uploads" });
      } else {
        q = req.body?.q || "";
        chatId = req.body?.chatId;
        if (!q) return res.status(400).send({ error: "q required" });
      }

      let chat = chatId ? await getChat(chatId) : undefined;
      if (!chat) chat = await mkChat(q);
      const id = chat.id;
      const ns = `chat:${id}`;

      res
        .status(202)
        .send({ ok: true, chatId: id, stream: `/ws/chat?chatId=${id}` });
      (async () => {
        try {
          if (isMp) {
            emitToAll(chatSockets.get(id), {
              type: "phase",
              value: "upload_start",
            });
            const tUp = Date.now();
            for (const f of files) {
              emitToAll(chatSockets.get(id), {
                type: "file",
                filename: f.filename,
                mime: f.mimeType,
              });
              await handleUpload({
                filePath: f.path,
                filename: f.filename,
                contentType: f.mimeType,
                namespace: ns,
              });
            }
            emitToAll(chatSockets.get(id), {
              type: "phase",
              value: "upload_done",
            });
          }

          const tUser = Date.now();
          await addMsg(id, { role: "user", content: q, at: Date.now() });
          emitToAll(chatSockets.get(id), {
            type: "phase",
            value: "generating",
          });

          let answer: any = "";

          const msgHistory = await getMsgs(id);
          const relevantHistory = msgHistory.slice(-20);

          answer = await handleAsk({
            q,
            namespace: ns,
            history: relevantHistory,
          });

          await addMsg(id, {
            role: "assistant",
            content: answer,
            at: Date.now(),
          });
          emitToAll(chatSockets.get(id), { type: "answer", answer });
          emitToAll(chatSockets.get(id), { type: "done" });
        } catch (err: any) {
          const msg = err?.message || "failed";
          const stack = err?.stack || String(err);
          console.error("[chat] err inner", { chatId: id, msg, stack });
          emitToAll(chatSockets.get(id), { type: "error", error: msg });
        }
      })().catch((e: any) => {
        console.error("[chat] err runner", e?.message || e);
      });
    } catch (e: any) {
      console.error("[chat] err outer", e?.message || e);
      next(e);
    }
  });

  app.get("/chats", async (_: any, res: any) => {
    const t = Date.now();
    const chats = await listChats();
    res.send({ ok: true, chats });
  });

  app.get("/chats/:id", async (req: any, res: any) => {
    const t = Date.now();
    const id = req.params.id;
    const chat = await getChat(id);
    if (!chat) {
      return res.status(404).send({ error: "not found" });
    }
    const messages = await getMsgs(id);
    res.send({ ok: true, chat, messages });
  });
}
