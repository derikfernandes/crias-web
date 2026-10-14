/**
 * Helpers de senha do aluno para scripts Node (espelho de server/lib/studentPassword.ts).
 * Não logar plaintext.
 */
import {
  createCipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'

const PREFIX = 'scrypt'
const KEY_LEN = 32
const AES_ALGO = 'aes-256-gcm'
const AES_IV_LEN = 12

const PASSWORD_DIGITS = '23456789'
const PASSWORD_LETTERS = 'abcdefghjkmnpqrstuvwxyz'
const PASSWORD_ALPHABET = PASSWORD_DIGITS + PASSWORD_LETTERS
const GENERATED_PASSWORD_LEN = 6

function randomIndex(maxExclusive) {
  const maxByte = 256 - (256 % maxExclusive)
  for (;;) {
    const b = randomBytes(1)[0]
    if (b < maxByte) return b % maxExclusive
  }
}

function pickChar(alphabet) {
  return alphabet[randomIndex(alphabet.length)]
}

export function isGeneratedPasswordFormat(plain) {
  const s = String(plain).trim()
  if (s.length !== GENERATED_PASSWORD_LEN) return false
  if (!/^[a-z0-9]+$/.test(s)) return false
  if (/[0o1li]/.test(s)) return false
  return /[a-z]/.test(s) && /[0-9]/.test(s)
}

export function generateStudentPassword() {
  const chars = [pickChar(PASSWORD_LETTERS), pickChar(PASSWORD_DIGITS)]
  while (chars.length < GENERATED_PASSWORD_LEN) {
    chars.push(pickChar(PASSWORD_ALPHABET))
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
  const out = chars.join('')
  if (!isGeneratedPasswordFormat(out)) return generateStudentPassword()
  return out
}

export function hashStudentPassword(plain) {
  const normalized = String(plain).trim()
  if (normalized.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres.')
  }
  const salt = randomBytes(16)
  const hash = scryptSync(normalized, salt, KEY_LEN)
  return `${PREFIX}$${salt.toString('base64')}$${hash.toString('base64')}`
}

function getKey(env = process.env) {
  const raw = env.STUDENT_PASSWORD_KEY?.trim()
  if (!raw) {
    throw new Error('STUDENT_PASSWORD_KEY ausente.')
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('STUDENT_PASSWORD_KEY deve ter 32 bytes.')
  }
  return key
}

export function encryptStudentPassword(plain, env = process.env) {
  const normalized = String(plain).trim()
  const key = getKey(env)
  const iv = randomBytes(AES_IV_LEN)
  const cipher = createCipheriv(AES_ALGO, key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(normalized, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.')
}

export function buildPasswordFields(plainInput) {
  const plain = plainInput?.trim() ? plainInput.trim() : generateStudentPassword()
  return {
    password_hash: hashStudentPassword(plain),
    password_encrypted: encryptStudentPassword(plain),
    password_plain: plain,
  }
}

export function studentsToCsv(rows) {
  const header = 'escola,nome,celular,senha'
  const escape = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [header]
  for (const row of rows) {
    lines.push(
      [
        escape(row.school),
        escape(row.name),
        escape(row.phone_number),
        escape(row.password),
      ].join(','),
    )
  }
  return `${lines.join('\n')}\n`
}
