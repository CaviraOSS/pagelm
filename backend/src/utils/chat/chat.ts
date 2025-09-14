import { randomUUID } from "crypto";
import db from "../database/keyv";

export type ChatMeta = { id: string; title: string; at: number };
export type ChatMsg = { role: "user" | "assistant"; content: any; at: number };

export async function mkChat(t: string) {
  const id = randomUUID();
  const c: ChatMeta = { id, title: t.slice(0, 60), at: Date.now() };
  await db.set(`chat:${id}`, c);
  await db.set(`msgs:${id}`, [] as ChatMsg[]);
  const idx = ((await db.get("chat:index")) as string[]) || [];
  idx.unshift(id);
  await db.set("chat:index", idx.slice(0, 1000));
  return c;
}

export async function getChat(id: string) {
  const a = await db.get(`chat:${id}`);
  return a;
}

export async function addMsg(id: string, m: ChatMsg) {
  const a = ((await db.get(`msgs:${id}`)) as ChatMsg[]) || [];
  a.push(m);
  await db.set(`msgs:${id}`, a);
  const c = (await db.get(`chat:${id}`)) as ChatMeta;
  if (c) {
    c.at = Date.now();
    await db.set(`chat:${id}`, c);
  }
}

export async function listChats(n = 50) {
  const idx = ((await db.get("chat:index")) as string[]) || [];
  const out: ChatMeta[] = [];
  for (const id of idx.slice(0, n)) {
    const c = (await db.get(`chat:${id}`)) as ChatMeta | undefined;
    if (c) out.push(c);
  }
  return out.sort((x, y) => y.at - x.at);
}

export async function getMsgs(id: string) {
  const a = ((await db.get(`msgs:${id}`)) as ChatMsg[]) || [];
  return a;
}
