import { loadXlsx } from './loadXlsx'

/** Leitura e download de planilhas (CSV ou XLSX) usados nas importações e exportações. */

export type Row = Record<string, string>

/** Lê a primeira aba de uma planilha CSV ou XLSX. Células vazias viram "". */
export async function readTable(file: File): Promise<Row[]> {
  const XLSX = await loadXlsx()
  const isCsv = /\.csv$|\.txt$/i.test(file.name)
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: 'string', FS: undefined })
    : XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false })
  return rows.map((r) => {
    const out: Row = {}
    for (const [k, v] of Object.entries(r)) out[k.trim()] = String(v ?? '').trim()
    return out
  })
}

/** Valor de uma coluna ignorando maiúsculas, acentos e espaços do cabeçalho. */
export function pick(row: Row, ...names: string[]): string {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
  const wanted = names.map(norm)
  for (const [k, v] of Object.entries(row)) {
    if (wanted.includes(norm(k))) return v
  }
  return ''
}

/** "sim", "s", "1", "true" e "x" são verdadeiros; "não", "nao", "n", "0" e "false", falsos. */
export function parseYesNo(value: string): boolean | null {
  const v = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
  if (!v) return null
  if (['sim', 's', '1', 'true', 'x', 'yes', 'y'].includes(v)) return true
  if (['nao', 'n', '0', 'false', 'no'].includes(v)) return false
  return null
}

function csvEscape(v: string, sep: string): string {
  return /["\n\r]/.test(v) || v.includes(sep) ? `"${v.replaceAll('"', '""')}"` : v
}

/** CSV com BOM e ";" (abre direto no Excel em português). Para a API: `{ sep: ',', bom: false }`. */
export function toCsv(
  headers: string[],
  rows: string[][],
  opts: { sep?: string; bom?: boolean } = {},
): string {
  const sep = opts.sep ?? ';'
  const body = [headers, ...rows].map((r) => r.map((c) => csvEscape(c, sep)).join(sep)).join('\r\n') + '\r\n'
  return ((opts.bom ?? true) ? '\uFEFF' : '') + body
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  downloadBlob(filename, new Blob([text], { type: mime }))
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
