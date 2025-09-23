import fs from "fs";
import path from "path";
import crypto from "crypto";
import { StateGraph, Annotation } from "@langchain/langgraph";
import { getRetriever } from "../../utils/database/db";
import llm, { embeddings } from "../../utils/llm/llm";

export type AskCard = { q: string; a: string; tags?: string[] };
export type AskPayload = {
  topic: string;
  answer: string;
  flashcards: AskCard[];
};

function toText(out: any): string {
  if (!out) return "";
  if (typeof out === "string") return out;
  if (typeof out?.content === "string") return out.content;
  if (Array.isArray(out?.content))
    return out.content
      .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
      .join("");
  if (Array.isArray(out?.generations) && out.generations[0]?.text)
    return out.generations[0].text;
  return String(out ?? "");
}

function guessTopic(q: string): string {
  const t = q.trim().replace(/\s+/g, " ");
  if (t.length <= 80) return t;
  const m =
    t.match(/\babout\s+([^?.!]{3,80})/i) ||
    t.match(/\b(on|of|for|in)\s+([^?.!]{3,80})/i);
  return (m?.[2] || m?.[1] || t.slice(0, 80)).trim();
}

function extractFirstJsonObject(s: string): string {
  let depth = 0,
    start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) return s.slice(start, i + 1);
    }
  }
  return "";
}

function tryParse<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `
ROLE
- You are NeuroPilot, a master educator.

OUTPUT
- Return ONLY one JSON object with this exact shape:
{
  "topic": "string",
  "answer": "GitHub-Flavored Markdown, length and depth scaled by importance or explicit human request.",
  "flashcards": [
    { "q": "string", "a": "string", "tags": ["core","def","why","how","pitfall"] },
    ...
  ]
}

ANSWER GENERATION
1. Importance Scaling (0–10)
   - Internally rate topic importance (do not output rating).
   - Expand "answer" proportionally:
     * 0–2 → very short overview (1–2 sentences, ~30–50 words).
     * 3–5 → mid-size (2–3 paragraphs, ~200–400 words).
     * 6–8 → detailed (4–6 paragraphs, ~400–700 words).
     * 9–10 → large, comprehensive (6+ paragraphs, 700+ words).
   - If the human explicitly specifies summary/word count/format → FOLLOW that exactly, overriding scaling.

2. Markdown Requirements
   - Always return GitHub-Flavored Markdown.
   - Use clear structure:
     * Headings (##, ###).
     * Lists (-, 1.).
     * Code blocks (\`\`\`) where useful.
   - Must look professional, educational, and structured.

FLASHCARDS
1. Count
   - Always produce 6–10 cards unless human explicitly requests otherwise.
2. Quality
   - Non-overlapping, self-contained.
   - q ≤ 100 chars, a ≤ 200 chars.
3. Tags
   - Must include at least one "how" and one "pitfall".
   - Only use: core, def, why, how, pitfall.

STYLE
- Educational, structured, precise.
- Avoid redundancy.

EXAMPLE
{
  "topic": "binary search",
  "answer": "## Binary Search\\n\\nBinary Search is one of the most important algorithms in computer science because it demonstrates the principle of divide-and-conquer. It is used to quickly locate a target value within a sorted dataset by repeatedly dividing the search interval in half.\\n\\n### Core Idea\\nInstead of scanning every element, binary search halves the problem space on each step, reducing the number of comparisons dramatically. For a dataset with millions of items, this efficiency translates into huge performance gains.\\n\\n### Process\\n1. Begin with two pointers: low (start) and high (end).\\n2. Compute mid = low + (high - low) / 2.\\n3. If array[mid] == target, return mid.\\n4. If array[mid] < target, move low to mid + 1.\\n5. If array[mid] > target, move high to mid - 1.\\n6. Repeat until low exceeds high (target not found).\\n\\n### Complexity Analysis\\n- **Time Complexity:** O(log n) because the search space is halved each step.\\n- **Space Complexity:** O(1) in iterative implementation; O(log n) in recursive form.\\n\\n### Real-World Applications\\n- Searching dictionaries or encyclopedias.\\n- Looking up names in a sorted contact list.\\n- Database indexing systems.\\n- Network routing tables.\\n\\n### Pitfalls\\n- **Unsorted Data:** Binary search fails unless the dataset is sorted.\\n- **Overflow Bug:** Using (low + high)/2 may cause overflow; safer to compute low + (high - low)/2.\\n- **Duplicates:** Special handling needed if dataset has many duplicates.\\n\\n### Example Implementation (JavaScript)\\n\\n\\\`\\\`\\\`js\\nfunction binarySearch(arr, target) {\\n  let low = 0, high = arr.length - 1;\\n  while (low <= high) {\\n    const mid = low + Math.floor((high - low) / 2);\\n    if (arr[mid] === target) return mid;\\n    if (arr[mid] < target) low = mid + 1;\\n    else high = mid - 1;\\n  }\\n  return -1;\\n}\\n\\\`\\\`\\\`\\n\\n### Summary\\nBinary search remains one of the most elegant examples of algorithmic efficiency. It teaches not only how to search faster but also how to approach problems by shrinking them step by step, a mindset that underlies much of algorithmic design.",
  "flashcards": [
    { "q": "What datasets does binary search work on?", "a": "Only on sorted datasets.", "tags": ["core","how"] },
    { "q": "What is the time complexity of binary search?", "a": "O(log n).", "tags": ["def"] },
    { "q": "Why is binary search efficient?", "a": "Because it halves the search space each step.", "tags": ["why"] },
    { "q": "How can you avoid overflow in mid calculation?", "a": "Use low + (high - low)/2.", "tags": ["how","pitfall"] },
    { "q": "What happens if the dataset is unsorted?", "a": "Results are invalid.", "tags": ["pitfall"] },
    { "q": "Core principle behind binary search?", "a": "Divide and conquer.", "tags": ["core"] },
    { "q": "Where is binary search commonly applied?", "a": "Dictionaries, indexes, routing tables.", "tags": ["why"] }
  ]
}

RESTRICTIONS
- Output ONLY the JSON object.
- No prose or explanation outside JSON.
- No backticks around JSON.
`.trim();

const cacheDir = path.join(process.cwd(), "storage", "cache", "ask");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
const keyOf = (x: any) =>
  crypto
    .createHash("sha256")
    .update(typeof x === "string" ? x : JSON.stringify(x))
    .digest("hex");
const readCache = (k: any) => {
  const f = path.join(cacheDir, keyOf(k) + ".json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null;
};
const writeCache = (k: any, v: any) => {
  const f = path.join(cacheDir, keyOf(k) + ".json");
  fs.writeFileSync(f, JSON.stringify(v));
};

type Ctx = {
  q: string;
  ns: string;
  k: number;
  ctx: string;
  topic: string;
  draft: string;
  out: AskPayload;
};

const S = Annotation.Root({
  q: Annotation<string>(),
  ns: Annotation<string>(),
  k: Annotation<number>(),
  ctx: Annotation<string>(),
  topic: Annotation<string>(),
  draft: Annotation<string>(),
  out: Annotation<AskPayload>(),
});

const nRetrieve = async (s: Ctx) => {
  const ck = { t: "retr", q: s.q, ns: s.ns, k: s.k };
  const c = readCache(ck);
  if (c) return { ...s, ctx: c.ctx, topic: c.topic };
  const retriever = await getRetriever(s.ns || "neuropilot", embeddings);
  const docs = await retriever.invoke(s.q);
  const ctx =
    (docs || [])
      .slice(0, s.k)
      .map((d: any) => d.pageContent)
      .join("\n\n") || "NO_CONTEXT";
  const topic = guessTopic(s.q) || "General";
  writeCache(ck, { ctx, topic });
  return { ...s, ctx, topic };
};

const nSynthesize = async (s: Ctx) => {
  const ck = { t: "ans", q: s.q, ctx: s.ctx, topic: s.topic };
  const c = readCache(ck);
  if (c) return { ...s, draft: c.draft };
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Context:\n${s.ctx}\n\nQuestion:\n${s.q}\n\nTopic:\n${s.topic}\n\nReturn only the JSON object.`,
    },
  ] as const;
  const res = await llm.call(messages as any);
  const draft = toText(res).trim();
  writeCache(ck, { draft });
  return { ...s, draft };
};

const nParse = async (s: Ctx) => {
  const jsonStr = extractFirstJsonObject(s.draft) || s.draft;
  const parsed = tryParse<any>(jsonStr);
  if (parsed && typeof parsed === "object") {
    const topic =
      typeof parsed.topic === "string" ? parsed.topic : s.topic || "General";
    const answer = typeof parsed.answer === "string" ? parsed.answer : "";
    const flashcards = Array.isArray(parsed.flashcards)
      ? (parsed.flashcards as AskCard[])
      : [];
    return { ...s, out: { topic, answer, flashcards } };
  }
  return {
    ...s,
    out: { topic: s.topic || "General", answer: s.draft, flashcards: [] },
  };
};

const g = new StateGraph(S);
g.addNode("retrieve", nRetrieve);
g.addNode("synthesize", nSynthesize);
g.addNode("parse", nParse);

const edge = (from: string, to: string) =>
  (g as any).addEdge(from as any, to as any);

edge("__start__", "retrieve");
edge("retrieve", "synthesize");
edge("synthesize", "parse");
edge("parse", "__end__");

const compiled = g.compile();

export async function handleAsk(
  q: string,
  ns?: string,
  k = 6
): Promise<AskPayload> {
  const s = await compiled.invoke({
    q,
    ns: ns || "neuropilot",
    k,
    ctx: "",
    topic: "",
    draft: "",
    out: { topic: "", answer: "", flashcards: [] },
  });
  return s.out;
}
