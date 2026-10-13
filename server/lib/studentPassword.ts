import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'

const PREFIX = 'scrypt'
const KEY_LEN = 32
const AES_ALGO = 'aes-256-gcm'
const AES_IV_LEN = 12
const AES_TAG_LEN = 16

/** Sem 0/o (ambíguos) e sem 1/l/i. */
const PASSWORD_DIGITS = '23456789'
const PASSWORD_LETTERS = 'abcdefghjkmnpqrstuvwxyz'
const PASSWORD_ALPHABET = PASSWORD_DIGITS + PASSWORD_LETTERS
const GENERATED_PASSWORD_LEN = 6

/**
 * Hash de senha do aluno (Firestore `students.password_hash`).
 * Não usa Firebase Auth — telefone + instituição + senha no login via API.
 * Aceita formatos legados (≥6 chars, ex. `@Marina12`) e o formato gerado (6 chars).
 */
export function hashStudentPassword(plain: string): string {
  const normalized = plain.trim()
  if (normalized.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres.')
  }
  const salt = randomBytes(16)
  const hash = scryptSync(normalized, salt, KEY_LEN)
  return `${PREFIX}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyStudentPassword(
  plain: string,
  stored: string | null | undefined,
): boolean {
  if (!stored || typeof stored !== 'string') return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== PREFIX) return false
  const salt = Buffer.from(parts[1], 'base64')
  const expected = Buffer.from(parts[2], 'base64')
  if (expected.length !== KEY_LEN) return false
  const actual = scryptSync(plain.trim(), salt, KEY_LEN)
  return timingSafeEqual(actual, expected)
}

/** True se a senha segue o formato gerado (6 chars, minúsculas+dígitos, sem ambíguos). */
export function isGeneratedPasswordFormat(plain: string): boolean {
  const s = plain.trim()
  if (s.length !== GENERATED_PASSWORD_LEN) return false
  if (!/^[a-z0-9]+$/.test(s)) return false
  if (/[0o1li]/.test(s)) return false
  const hasLetter = /[a-z]/.test(s)
  const hasDigit = /[0-9]/.test(s)
  return hasLetter && hasDigit
}

function randomIndex(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new Error('maxExclusive inválido')
  // Rejection sampling para evitar bias do modulo.
  const maxByte = 256 - (256 % maxExclusive)
  for (;;) {
    const b = randomBytes(1)[0]!
    if (b < maxByte) return b % maxExclusive
  }
}

function pickChar(alphabet: string): string {
  return alphabet[randomIndex(alphabet.length)]!
}

/**
 * Gera senha de 6 caracteres (CSPRNG): minúsculas + dígitos,
 * ≥1 letra e ≥1 dígito, sem 0/o/1/l/i.
 */
export function generateStudentPassword(): string {
  const chars: string[] = []
  chars.push(pickChar(PASSWORD_LETTERS))
  chars.push(pickChar(PASSWORD_DIGITS))
  while (chars.length < GENERATED_PASSWORD_LEN) {
    chars.push(pickChar(PASSWORD_ALPHABET))
  }
  // Fisher–Yates com CSPRNG
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    const tmp = chars[i]!
    chars[i] = chars[j]!
    chars[j] = tmp
  }
  const out = chars.join('')
  if (!isGeneratedPasswordFormat(out)) {
    // Extremamente improvável; regenera.
    return generateStudentPassword()
  }
  return out
}

export function getStudentPasswordKey(
  env: NodeJS.ProcessEnv = process.env,
): Buffer {
  const raw = env.STUDENT_PASSWORD_KEY?.trim()
  if (!raw) {
    throw new Error(
      'STUDENT_PASSWORD_KEY ausente. Defina uma chave de 32 bytes (base64 ou hex) no ambiente.',
    )
  }
  // Aceita base64 (44 chars típicos) ou hex (64 chars).
  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }
  if (key.length !== 32) {
    throw new Error(
      'STUDENT_PASSWORD_KEY deve decodificar para exatamente 32 bytes (AES-256).',
    )
  }
  return key
}

/**
 * Cifra a senha em plaintext com AES-256-GCM.
 * Formato armazenado: `v1.<iv_b64>.<tag_b64>.<ciphertext_b64>`
 * Nunca logar o plaintext.
 */
export function encryptStudentPassword(
  plain: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalized = plain.trim()
  if (!normalized) throw new Error('Senha vazia não pode ser cifrada.')
  const key = getStudentPasswordKey(env)
  const iv = randomBytes(AES_IV_LEN)
  const cipher = createCipheriv(AES_ALGO, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(normalized, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  if (tag.length !== AES_TAG_LEN) {
    throw new Error('Tag GCM inesperada.')
  }
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.')
}

export function decryptStudentPassword(
  stored: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (!stored || typeof stored !== 'string') return null
  const parts = stored.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const [, ivB64, tagB64, ctB64] = parts
  if (!ivB64 || !tagB64 || !ctB64) return null
  try {
    const key = getStudentPasswordKey(env)
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const ciphertext = Buffer.from(ctB64, 'base64')
    if (iv.length !== AES_IV_LEN || tag.length !== AES_TAG_LEN) return null
    const decipher = createDecipheriv(AES_ALGO, key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8')
    return plain
  } catch {
    return null
  }
}

export type StudentPasswordFields = {
  password_hash: string
  /** Ausente se `STUDENT_PASSWORD_KEY` não estiver configurada. */
  password_encrypted: string | null
  /** Plaintext só para retorno Master — nunca persistir nem logar. */
  password_plain: string
}

/**
 * Monta hash + ciphertext a partir de uma senha (fornecida ou gerada).
 * Login continua compatível com hashes legados já existentes.
 * Com `requireEncryption: true` (Master), falha se a chave AES estiver ausente.
 */
export function buildStudentPasswordFields(
  plainInput: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
  opts?: { generateIfEmpty?: boolean; requireEncryption?: boolean },
): StudentPasswordFields {
  let plain = typeof plainInput === 'string' ? plainInput.trim() : ''
  if (!plain) {
    if (opts?.generateIfEmpty === false) {
      throw new Error('Senha obrigatória.')
    }
    plain = generateStudentPassword()
  } else if (plain.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres.')
  }
  const password_hash = hashStudentPassword(plain)
  let password_encrypted: string | null = null
  try {
    password_encrypted = encryptStudentPassword(plain, env)
  } catch (e) {
    if (opts?.requireEncryption) {
      throw e instanceof Error
        ? e
        : new Error('STUDENT_PASSWORD_KEY ausente ou inválida.')
    }
    // PUT/create do painel: hash funciona sem chave; Master revelará após
    // configurar a env e regenerar.
  }
  return {
    password_hash,
    password_encrypted,
    password_plain: plain,
  }
}
