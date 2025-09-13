import fs from "fs";
import path from "path";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { config } from "../../config/env";

export async function saveDocuments(
  collection: string,
  docs: Document[],
  embeddings: EmbeddingsInterface
) {
  if (config.db_mode === "json") {
    const file = path.join(
      process.cwd(),
      "storage",
      "json",
      `${collection}.json`
    );
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify(
        docs.map((d) => ({
          pageContent: d.pageContent,
          metadata: d.metadata || {},
        })),
        null,
        2
      )
    );
  } else {
    await new Chroma(embeddings, {
      collectionName: collection,
      collectionMetadata: { "hnsw:space": "cosine" },
      url: "http://localhost:8000",
    }).addDocuments(docs);
  }
}

export async function getRetriever(
  collection: string,
  embeddings: EmbeddingsInterface
) {
  if (config.db_mode === "json") {
    const docs = (() => {
      const file = path.join(
        process.cwd(),
        "storage",
        "json",
        `${collection}.json`
      );
      return fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf-8")).map(
            (d: any) =>
              new Document({
                pageContent: d.pageContent || "",
                metadata: d.metadata || {},
              })
          )
        : [];
    })();

    const { MemoryVectorStore } = await import("langchain/vectorstores/memory");
    const store = await MemoryVectorStore.fromDocuments(
      docs.slice(0),
      embeddings
    );
    return store.asRetriever({ k: 4 });
  } else {
    const embeddings = new OpenAIEmbeddings({
      model: config.openrouter_model,
      openAIApiKey: config.openrouter,
      configuration: { baseURL: "https://openrouter.ai/api/v1" },
    });

    return (
      await new Chroma(embeddings, {
        collectionName: collection,
        url: "http://localhost:8000",
      })
    ).asRetriever({ k: 4 });
  }
}
