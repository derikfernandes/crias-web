/**
 * Extração de texto de PDF / DOCX / TXT / MD no servidor.
 * Limites: tamanho de arquivo e texto concatenado.
 */

export const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4 MiB por arquivo
export const MAX_TOTAL_CHARS = 120_000
export const MAX_FILES = 8

export type UploadedDoc = {
  filename: string
  mimeType: string
  /** Conteúdo base64 (sem data: prefix). */
  base64: string
}

export type ExtractedDoc = {
  filename: string
  text: string
  chars: number
}

export type ExtractResult = {
  docs: ExtractedDoc[]
  totalChars: number
  truncated: boolean
}

function decodeBase64(b64: string): Buffer {
  const cleaned = b64.replace(/^data:[^;]+;base64,/, '').trim()
  return Buffer.from(cleaned, 'base64')
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function sniffKind(
  filename: string,
  mimeType: string,
): 'pdf' | 'docx' | 'text' | 'unknown' {
  const ext = extOf(filename)
  const mime = (mimeType || '').toLowerCase()
  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf'
  if (
    ext === 'docx' ||
    mime.includes(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  ) {
    return 'docx'
  }
  if (
    ['txt', 'md', 'markdown', 'text'].includes(ext) ||
    mime.startsWith('text/')
  ) {
    return 'text'
  }
  return 'unknown'
}

async function extractPdf(buf: Buffer): Promise<string> {
  // pdf-parse v1 API
  const pdfParse = (await import('pdf-parse')).default as (
    data: Buffer,
  ) => Promise<{ text: string }>
  const result = await pdfParse(buf)
  return (result.text || '').trim()
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer: buf })
  return (result.value || '').trim()
}

function extractPlain(buf: Buffer): string {
  return buf.toString('utf8').trim()
}

export async function extractDocuments(
  files: UploadedDoc[],
): Promise<ExtractResult> {
  if (!files.length) {
    throw new Error('Envie pelo menos um documento (PDF, DOCX ou TXT/MD).')
  }
  if (files.length > MAX_FILES) {
    throw new Error(`No máximo ${MAX_FILES} arquivos por geração.`)
  }

  const docs: ExtractedDoc[] = []
  let totalChars = 0
  let truncated = false

  for (const file of files) {
    const buf = decodeBase64(file.base64)
    if (buf.byteLength === 0) {
      throw new Error(`Arquivo vazio: ${file.filename}`)
    }
    if (buf.byteLength > MAX_FILE_BYTES) {
      throw new Error(
        `Arquivo muito grande: ${file.filename} (máx. ${Math.floor(MAX_FILE_BYTES / (1024 * 1024))} MB).`,
      )
    }
    const kind = sniffKind(file.filename, file.mimeType)
    let text = ''
    if (kind === 'pdf') text = await extractPdf(buf)
    else if (kind === 'docx') text = await extractDocx(buf)
    else if (kind === 'text') text = extractPlain(buf)
    else {
      throw new Error(
        `Formato não suportado: ${file.filename}. Use PDF, DOCX ou TXT/MD.`,
      )
    }
    if (!text) {
      throw new Error(`Não foi possível extrair texto de: ${file.filename}`)
    }
    if (totalChars + text.length > MAX_TOTAL_CHARS) {
      const remaining = Math.max(0, MAX_TOTAL_CHARS - totalChars)
      text = text.slice(0, remaining)
      truncated = true
    }
    docs.push({ filename: file.filename, text, chars: text.length })
    totalChars += text.length
    if (truncated) break
  }

  if (totalChars < 40) {
    throw new Error('Texto extraído insuficiente para gerar uma trilha.')
  }

  return { docs, totalChars, truncated }
}

export function formatSourcesForPrompt(docs: ExtractedDoc[]): string {
  return docs
    .map(
      (d, i) =>
        `===== FONTE ${i + 1}: ${d.filename} (${d.chars} caracteres) =====\n${d.text}`,
    )
    .join('\n\n')
}
