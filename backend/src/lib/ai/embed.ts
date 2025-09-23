import fs from 'fs'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from '@langchain/core/documents'
import { embeddings } from '../../utils/llm/llm'
import { saveDocuments } from '../../utils/database/db'

export async function embedTextFromFile(filePath: string, namespace: string) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 512, chunkOverlap: 30 })
  const docs: Document[] = await splitter.createDocuments([raw])

  await saveDocuments(namespace, docs, embeddings)
  return 'Uploaded successfully.'
}