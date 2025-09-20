import fs from "fs"
import path from "path"
import { Chroma } from "@langchain/community/vectorstores/chroma"
import { Document } from "@langchain/core/documents"
import { EmbeddingsInterface } from "@langchain/core/embeddings"
import { config } from "../../config/env"

const memoryStores: Record<string, any> = {}
const retrieverCache: Record<string, any> = {}

export async function saveDocuments(
  collection: string,
  docs: Document[],
  embeddings: EmbeddingsInterface
) {
  if (config.db_mode === "json") {
    const file = path.join(process.cwd(), "storage", "json", `${collection}.json`)
    const dir = path.dirname(file)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      file,
      JSON.stringify(
        docs.map(d => ({
          pageContent: typeof d.pageContent === "string" ? d.pageContent : String(d.pageContent ?? ""),
          metadata: d.metadata || {}
        })),
        null,
        2
      )
    )
    delete memoryStores[collection]
    delete retrieverCache[collection]
  } else {
    const store = new Chroma(embeddings, {
      collectionName: collection,
      collectionMetadata: { "hnsw:space": "cosine" },
      url: "http://localhost:8000",
    })
    await store.addDocuments(docs)
    retrieverCache[collection] = store.asRetriever({ k: 4 })
  }
}

export async function getRetriever(
  collection: string,
  embeddings: EmbeddingsInterface
) {
  if (retrieverCache[collection]) return retrieverCache[collection]

  if (config.db_mode === "json") {
    const file = path.join(process.cwd(), "storage", "json", `${collection}.json`)
    const docsRaw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : []
    const docs = docsRaw.map((d: any) => new Document({
      pageContent: typeof d.pageContent === "string" ? d.pageContent : String(d.pageContent ?? ""),
      metadata: d.metadata || {},
    }))
    if (!memoryStores[collection]) {
      const { MemoryVectorStore } = await import("langchain/vectorstores/memory")
      memoryStores[collection] = await MemoryVectorStore.fromDocuments(docs, embeddings)
    }
    retrieverCache[collection] = memoryStores[collection].asRetriever({ k: 4 })
    return retrieverCache[collection]
  } else {
    const store = new Chroma(embeddings, {
      collectionName: collection,
      url: "http://localhost:8000",
    })
    retrieverCache[collection] = store.asRetriever({ k: 4 })
    return retrieverCache[collection]
  }
}