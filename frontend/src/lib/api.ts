import { env } from "../config/env";

export type ChatStartResponse = { ok: true; chatId: string; stream: string };
export type ChatMessage = { role: "user" | "assistant"; content: string; at: number };
export type ChatInfo = { id: string; title?: string; createdAt?: number };
export type ChatsList = { ok: true; chats: ChatInfo[] };
export type ChatDetail = { ok: true; chat: ChatInfo; messages: ChatMessage[] };
export type ChatJSONBody = { q: string; chatId?: string };
export type ChatPhase = "upload_start" | "upload_done" | "generating";
export type FlashCard = { q: string; a: string; tags?: string[] };
export type Question = { id: number; question: string; options: string[]; correct: number; hint: string; explanation: string; imageHtml?: string; };
export type QuizStartResponse = { ok: true; quizId: string; stream: string }
export type QuizEvent = { type: "ready" | "phase" | "quiz" | "done" | "error" | "ping"; quizId?: string; value?: string; quiz?: unknown; error?: string; t?: number }
export type SmartNotesStart = { ok: true; noteId: string; stream: string }
export type SavedFlashcard = {
  id: string;
  question: string;
  answer: string;
  tag: string;
  created: number;
};
export type ExamEvent =
  | { type: "ready"; runId: string }
  | { type: "phase"; value: string; examId?: string }
  | { type: "exam"; examId: string; payload: Question[] }
  | { type: "done" }
  | { type: "error"; examId?: string; error: string };
export type PodcastEvent =
  | { type: "ready"; pid: string }
  | { type: "phase"; value: string }
  | { type: "file"; filename: string; mime: string }
  | { type: "warn"; message: string }
  | { type: "script"; data: any }
  | { type: "audio"; file: string; filename?: string; staticUrl?: string }
  | { type: "done" }
  | { type: "error"; error: string }
export type SmartNotesEvent =
  | { type: "ready"; noteId: string }
  | { type: "phase"; value: string }
  | { type: "file"; file: string }
  | { type: "done" }
  | { type: "error"; error: string }
  | { type: "ping"; t: number }
export type StudyMaterials = {
  summary: string;
  keyPoints: string[];
  topics: string[];
  categories: string[];
  searchableKeywords: string[];
  studyGuide: {
    mainConcepts: string[];
    importantTerms: { term: string; definition: string; }[];
    questions: string[];
    takeaways: string[];
  };
  timestamps?: { time: number; content: string; topic: string; }[];
};

export type TranscriptionResponse = {
  ok: boolean;
  transcription?: string;
  provider?: string;
  confidence?: number;
  error?: string;
  studyMaterials?: StudyMaterials;
}
export type ChatEvent =
  | { type: "ready"; chatId: string }
  | { type: "phase"; value: ChatPhase }
  | { type: "file"; filename: string; mime: string }
  | { type: "answer"; answer: AnswerPayload }
  | { type: "done" }
  | { type: "error"; error: string };

type O<T> = Promise<T>;
type AnswerPayload = string | { answer: string; flashcards?: FlashCard[] };

const timeoutCtl = (ms: number) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t) };
};

async function req<T = unknown>(
  url: string,
  init: RequestInit & { timeout?: number } = {}
): O<T> {
  const { timeout = env.timeout, ...rest } = init;
  const { signal, done } = timeoutCtl(timeout);
  try {
    const r = await fetch(url, { signal, ...rest });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`http ${r.status}: ${txt || r.statusText}`);
    }
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await r.json()) as T;
    return (await r.text()) as unknown as T;
  } finally {
    done();
  }
}

const jsonHeaders = (_?: unknown) => {
  const h = new Headers();
  h.set("content-type", "application/json");
  return h;
};

function wsURL(path: string) {
  const u = new URL(env.backend);
  const proto = u.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${u.host}${path}`;
}

export async function chatJSON(body: ChatJSONBody) {
  return req<ChatStartResponse>(`${env.backend}/chat`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify(body),
  });
}

export async function chatMultipart(q: string, files: File[], chatId?: string) {
  const f = new FormData();
  f.append("q", q);
  if (chatId) f.append("chatId", chatId);
  for (const file of files) f.append("file", file, file.name);
  return req<ChatStartResponse>(`${env.backend}/chat`, {
    method: "POST",
    body: f,
    timeout: Math.max(env.timeout, 300000),
  });
}

export function connectChatStream(chatId: string, onEvent: (ev: ChatEvent) => void) {
  const url = wsURL(`/ws/chat?chatId=${encodeURIComponent(chatId)}`);
  const ws = new WebSocket(url);
  ws.onmessage = (m) => {
    try {
      const data = JSON.parse(m.data as string) as ChatEvent;
      onEvent(data);
    } catch { }
  };
  ws.onerror = () => {
    onEvent({ type: "error", error: "stream_error" });
  };
  return { ws, close: () => { try { ws.close(); } catch { } } };
}

export async function chatAskOnce(opts: {
  q: string;
  files?: File[];
  chatId?: string;
  onEvent?: (ev: ChatEvent) => void;
}) {
  const { q, files = [], chatId, onEvent } = opts;
  const start = files.length ? await chatMultipart(q, files, chatId) : await chatJSON({ q, chatId });
  let answer = "";
  let flashcards: FlashCard[] | undefined;

  await new Promise<void>((resolve, reject) => {
    const { close } = connectChatStream(start.chatId, (ev) => {
      onEvent?.(ev);
      if (ev.type === "answer") {
        const p = ev.answer;
        if (typeof p === "string") {
          answer = p;
        } else if (p && typeof p === "object") {
          answer = p.answer ?? "";
          if (Array.isArray(p.flashcards)) flashcards = p.flashcards;
        }
      }
      if (ev.type === "done") { close(); resolve(); }
      if (ev.type === "error") { close(); reject(new Error(ev.error || "chat failed")); }
    });
  });

  return { chatId: start.chatId, answer, flashcards };
}

export function getChats() {
  return req<ChatsList>(`${env.backend}/chats`, { method: "GET" });
}

export function getChatDetail(id: string) {
  return req<ChatDetail>(`${env.backend}/chats/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function createFlashcard(input: {
  question: string;
  answer: string;
  tag: string;
}) {
  return req<{ ok: true; flashcard: SavedFlashcard }>(`${env.backend}/flashcards`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify(input),
  });
}

export async function listFlashcards() {
  return req<{ ok: true; flashcards: SavedFlashcard[] }>(`${env.backend}/flashcards`, {
    method: "GET",
  });
}

export async function deleteFlashcard(id: string) {
  return req<{ ok: true }>(`${env.backend}/flashcards/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getExams() {
  return req<{ ok: true; exams: { id: string; name: string; sections: any[] }[] }>(
    `${env.backend}/exams`,
    { method: "GET" }
  )
}

export async function startExam(examId: string) {
  return req<{ ok: true; runId: string; stream: string }>(
    `${env.backend}/exam`,
    {
      method: "POST",
      headers: jsonHeaders({}),
      body: JSON.stringify({ examId }),
    }
  )
}

export function connectExamStream(runId: string, onEvent: (ev: ExamEvent) => void) {
  const url = wsURL(`/ws/exams?runId=${encodeURIComponent(runId)}`)
  const ws = new WebSocket(url)
  ws.onmessage = (m) => {
    try {
      onEvent(JSON.parse(m.data as string) as ExamEvent)
    } catch { }
  }
  ws.onerror = () => onEvent({ type: "error", error: "stream_error" })
  return { ws, close: () => { try { ws.close() } catch { } } }
}

export async function smartnotesStart(input: { topic?: string; notes?: string; filePath?: string }) {
  return req<SmartNotesStart>(`${env.backend}/smartnotes`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
}

export function connectSmartnotesStream(noteId: string, onEvent: (ev: SmartNotesEvent) => void) {
  const url = wsURL(`/ws/smartnotes?noteId=${encodeURIComponent(noteId)}`);
  const ws = new WebSocket(url);
  ws.onmessage = (m) => {
    try {
      onEvent(JSON.parse(m.data as string) as SmartNotesEvent);
    } catch { }
  };
  ws.onerror = () => onEvent({ type: "error", error: "stream_error" });
  return { ws, close: () => { try { ws.close(); } catch { } } };
}

export function flashcards(topic: string) {
  return req<{ cards: unknown[] }>(`${env.backend}/flashcards`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ topic }),
  });
}

export async function quizStart(topic: string) {
  return req<QuizStartResponse>(`${env.backend}/quiz`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify({ topic })
  }
  )
}

export async function podcastStart(payload: { topic: string }) {
  const url = `${env.backend}/podcast`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to start podcast")
  return data
}

export function connectPodcastStream(pid: string, onEvent: (ev: any) => void) {
  const wsUrl = `${env.backend.replace(/^http/, "ws")}/ws/podcast?pid=${pid}`
  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      onEvent(msg)
    } catch (err) {
      onEvent({ type: "error", error: "invalid_message" })
    }
  }

  ws.onclose = (e) => {
  }

  ws.onerror = () => onEvent({ type: "error", error: "stream_error" } as any)
  return { ws, close: () => { try { ws.close() } catch { } } }
}

export function connectQuizStream(quizId: string, onEvent: (ev: QuizEvent) => void) {
  const url = wsURL(`/ws/quiz?quizId=${encodeURIComponent(quizId)}`);
  const ws = new WebSocket(url); ws.onmessage = m => {
    try {
      onEvent(JSON.parse(m.data as string) as QuizEvent)
    } catch { }
  }; ws.onerror = () => onEvent({ type: "error", error: "stream_error" } as any); return { ws, close: () => { try { ws.close() } catch { } } }
}

export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return req<TranscriptionResponse>(`${env.backend}/transcriber`, {
    method: 'POST',
    body: formData,
    timeout: Math.max(env.timeout, 180000),
  });
}

export type PlannerTask = {
  id: string;
  course?: string;
  title: string;
  type?: string;
  notes?: string;
  dueAt: number;
  estMins: number;
  priority: 1 | 2 | 3 | 4 | 5;
  status: "todo" | "doing" | "done" | "blocked";
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  files?: { id: string; filename: string; originalName: string; mimeType: string; size: number; uploadedAt: number }[];
};

export type PlannerSlot = { id: string; taskId: string; start: number; end: number; kind: "focus" | "review" | "buffer"; done?: boolean }
export type WeeklyPlan = { days: { date: string; slots: PlannerSlot[] }[] }

export type PlannerEvent =
  | { type: "ready"; sid: string }
  | { type: "phase"; value: string }
  | { type: "plan.update"; taskId: string; slots: PlannerSlot[] }
  | { type: "materials.chunk"; id: string; idx: number; total: number; more: boolean; encoding: string; data: string }
  | { type: "materials.done"; id: string; total: number }
  | { type: "reminder"; text: string; at: number; taskId?: string; scheduledFor?: string }
  | { type: "daily.digest"; date: string; due: { id: string; title: string; dueAt: number }[]; sessions: number; message: string }
  | { type: "evening.review"; date: string; stats: any; tomorrowTasks: { id: string; title: string }[]; message: string }
  | { type: "break.reminder"; text: string; at: string }
  | { type: "task.created"; task: PlannerTask }
  | { type: "task.updated"; task: PlannerTask }
  | { type: "task.deleted"; taskId: string }
  | { type: "task.files.added"; taskId: string; files: any[] }
  | { type: "task.file.removed"; taskId: string; fileId: string }
  | { type: "session.started"; session: { id: string; taskId: string; slotId?: string; startedAt: string; status: string } }
  | { type: "session.ended"; session: { id: string; endedAt: string; minutesWorked: number; completed: boolean; status: string } }
  | { type: "weekly.update"; plan: WeeklyPlan }
  | { type: "slot.update"; taskId: string; slotId: string; done: boolean; skip: boolean }
  | { type: "done" };

export async function plannerIngest(text: string) {
  return req<{ ok: boolean; task: PlannerTask }>(`${env.backend}/tasks/ingest`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify({ text })
  })
}

export async function plannerList(params?: { status?: string; dueBefore?: number; course?: string }) {
  const q = new URLSearchParams()
  if (params?.status) q.set("status", params.status)
  if (params?.dueBefore) q.set("dueBefore", String(params.dueBefore))
  if (params?.course) q.set("course", params.course)
  const url = `${env.backend}/tasks${q.toString() ? `?${q}` : ""}`
  return req<{ ok: boolean; tasks: PlannerTask[] }>(url, { method: "GET" })
}

export async function plannerPlan(id: string, cram?: boolean) {
  return req<{ ok: boolean; task: PlannerTask & { plan?: { slots: PlannerSlot[] } } }>(`${env.backend}/tasks/${encodeURIComponent(id)}/plan`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify({ cram: !!cram })
  })
}

export async function plannerWeekly(cram?: boolean) {
  return req<{ ok: boolean; plan: WeeklyPlan }>(`${env.backend}/planner/weekly`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify({ cram: !!cram })
  })
}

export async function plannerMaterials(id: string, kind: "summary" | "studyGuide" | "flashcards" | "quiz") {
  return req<{ ok: boolean; data: any }>(`${env.backend}/tasks/${encodeURIComponent(id)}/materials`, {
    method: "POST",
    headers: jsonHeaders({}),
    body: JSON.stringify({ kind })
  })
}

export function connectPlannerStream(sid: string, onEvent: (ev: PlannerEvent) => void) {
  const url = wsURL(`/ws/planner?sid=${encodeURIComponent(sid)}`)
  const ws = new WebSocket(url)
  ws.onmessage = (m) => {
    try {
      const ev = JSON.parse(m.data as string)
      onEvent(ev)
    } catch { }
  }
  ws.onerror = () => { /* ignore for now */ }
  return { ws, close: () => { try { ws.close() } catch { } } }
}

export async function plannerUpdate(id: string, patch: Partial<PlannerTask>) {
  return req<{ ok: boolean; task: PlannerTask }>(`${env.backend}/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: jsonHeaders({}),
    body: JSON.stringify(patch)
  })
}

export async function plannerDelete(id: string) {
  return req<{ ok: boolean }>(`${env.backend}/tasks/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export async function plannerCreateWithFiles(data: { text?: string; title?: string; course?: string; type?: string; files?: File[] }) {
  const formData = new FormData()
  if (data.text) formData.append('q', data.text)
  if (data.title) formData.append('title', data.title)
  if (data.course) formData.append('course', data.course)
  if (data.type) formData.append('type', data.type)
  if (data.files) {
    for (const file of data.files) {
      formData.append('file', file, file.name)
    }
  }

  return req<{ ok: boolean; task: PlannerTask & { files?: any[] } }>(`${env.backend}/tasks`, {
    method: "POST",
    body: formData,
    timeout: Math.max(env.timeout, 300000),
  })
}

export async function plannerUploadFiles(taskId: string, files: File[]) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('file', file, file.name)
  }

  return req<{ ok: boolean; files: any[] }>(`${env.backend}/tasks/${encodeURIComponent(taskId)}/files`, {
    method: "POST",
    body: formData,
    timeout: Math.max(env.timeout, 300000),
  })
}

export async function plannerDeleteFile(taskId: string, fileId: string) {
  return req<{ ok: boolean }>(`${env.backend}/tasks/${encodeURIComponent(taskId)}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE"
  })
}

export function err(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}