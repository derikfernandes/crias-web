/**
 * Espelho FE de `server/lib/trail-engine/phoneNormalize.ts` (Ciclo 1 B7).
 * Manter paridade com o server — ver `phoneNormalize.parity.test.ts`.
 */

export type PhoneCanonicalResult =
  | { ok: true; canonical: string; digits: string }
  | { ok: false; reason: 'empty' | 'invalid_length' }

export type PhoneLookupVariants = {
  /** Dígitos sanitizados da query original (após strip \D). */
  query: string
  /** Ordem de tentativa para Firestore equality. */
  variants: string[]
}

/** Strip non-digits. */
export function stripPhoneDigits(input: string | number): string {
  return String(input).replace(/\D/g, '')
}

/**
 * Canônico para escrita nova: 55 + local 10–11 dígitos → 12–13 total.
 */
export function toCanonicalPhone(
  input: string | number,
): PhoneCanonicalResult {
  const digits = stripPhoneDigits(input)
  if (!digits) return { ok: false, reason: 'empty' }

  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return { ok: true, canonical: digits, digits }
  }

  if (digits.length === 10 || digits.length === 11) {
    return { ok: true, canonical: `55${digits}`, digits }
  }

  return { ok: false, reason: 'invalid_length' }
}

/**
 * Variantes de lookup (ordem): Q → sem 55 → com 55.
 * Deduplicadas, preservando ordem.
 */
export function phoneLookupVariants(
  input: string | number,
): PhoneLookupVariants {
  const query = stripPhoneDigits(input)
  const variants: string[] = []
  const push = (v: string) => {
    if (v && !variants.includes(v)) variants.push(v)
  }

  if (!query) return { query: '', variants: [] }

  push(query)

  if (query.startsWith('55') && (query.length === 12 || query.length === 13)) {
    push(query.slice(2))
  }

  if (query.length === 10 || query.length === 11) {
    push(`55${query}`)
  }

  if (query.startsWith('55') && query.length > 2) {
    const local = query.slice(2)
    if (local.length === 10 || local.length === 11) {
      push(local)
    }
  }

  return { query, variants }
}

export function isValidCanonicalPhone(digits: string): boolean {
  return (
    digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
  )
}

/** Preferência de login: canónico se válido; senão dígitos crus. */
export function phoneForLogin(input: string | number): string {
  const canonical = toCanonicalPhone(input)
  if (canonical.ok) return canonical.canonical
  return stripPhoneDigits(input)
}
