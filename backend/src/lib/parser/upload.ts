import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'
import Busboy from 'busboy'
import { marked } from 'marked'
import { embedTextFromFile } from '../ai/embed'
import { OllamaEmbeddings } from '@langchain/ollama'
import { OpenAIEmbeddings } from '@langchain/openai'

const str = path.join(process.cwd(), 'storage', 'uploads')
if (!fs.existsSync(str)) fs.mkdirSync(str, { recursive: true })

export type UpFile = { path: string; filename: string; mimeType: string }

export function parseMultipart(req: any): Promise<{ q: string; chatId?: string; files: UpFile[] }> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers })
    let q = ''
    let chatId = ''
    const files: UpFile[] = []
    let pending = 0
    let ended = false
    let failed = false
    const done = () => { if (!failed && ended && pending === 0) resolve({ q, chatId: chatId || undefined, files }) }

    bb.on('field', (n, v) => { if (n === 'q') q = v; if (n === 'chatId') chatId = v })
    bb.on('file', (_n, file, info: any) => {
      pending++
      const filename = info?.filename || 'file'
      const mimeType = info?.mimeType || info?.mime || 'application/octet-stream'
      const fp = path.join(str, `${Date.now()}-${filename}`)
      const ws = fs.createWriteStream(fp)
      file.on('error', e => { failed = true; reject(e) })
      ws.on('error', e => { failed = true; reject(e) })
      ws.on('finish', () => { files.push({ path: fp, filename, mimeType }); pending--; done() })
      file.pipe(ws)
    })
    bb.on('error', e => { failed = true; reject(e) })
    bb.on('finish', () => { ended = true; done() })
    req.pipe(bb)
  })
}

export async function handleUpload(a: { filePath: string; filename?: string; contentType?: string; namespace?: string }): Promise<{ stored: string }> {
  const fp = a.filePath
  const mime = a.contentType || ''
  const ns = a.namespace || 'pagelm'
  const txt = await extractText(fp, mime)
  if (!txt?.trim()) throw new Error('No valid content extracted from file.')
  const out = `${fp}.txt`
  fs.writeFileSync(out, txt)
  const isO = process.env.LLM_PROVIDER === 'ollama'
  const _emb = isO
    ? new OllamaEmbeddings({ model: process.env.OLLAMA_MODEL || 'llama3' })
    : new OpenAIEmbeddings({ model: 'text-embedding-3-small', openAIApiKey: process.env.OPENROUTER_API_KEY, configuration: { baseURL: 'https://openrouter.ai/api/v1' } })
  await embedTextFromFile(out, ns)
  return { stored: out }
}

async function extractText(filePath: string, mime: string) {
  const raw = fs.readFileSync(filePath)
  if (mime.includes('pdf')) {
    const data = await pdf(raw)
    return data.text
  }
  if (mime.includes('markdown')) {
    return marked.parse(raw.toString())
  }
  if (mime.includes('plain')) {
    return raw.toString()
  }
  if (mime.includes('wordprocessingml') || mime.includes('msword') || mime.includes('vnd.oasis.opendocument.text')) {
    const r = await mammoth.extractRawText({ buffer: raw })
    return r.value
  }
  throw new Error('unsupported file type')
}
