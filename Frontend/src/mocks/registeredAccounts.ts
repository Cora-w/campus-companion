import type { Account } from '../types/domain.ts'
import type { RegisterRequest } from '../api/contracts.ts'

type Registration = { id: string; schoolId: string; account: string; nickname: string; salt: string; hash: string; phone?: string }
const key = 'campus-demo-registrations-v1'
const hex = (bytes: Uint8Array) => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
export function readRegistrations(storage?: Pick<Storage, 'getItem'>): Registration[] {
  try {
    const rows: unknown = JSON.parse((storage || globalThis.localStorage).getItem(key) || '[]')
    if (!Array.isArray(rows)) return []
    return rows.filter((row): row is Registration => row && typeof row.id === 'string' && row.id.startsWith('registered-') && typeof row.schoolId === 'string' && typeof row.account === 'string' && typeof row.nickname === 'string' && /^[0-9a-f]{32}$/.test(row.salt) && /^[0-9a-f]{64}$/.test(row.hash))
  } catch { return [] }
}
export function registeredAccounts(): Account[] {
  return readRegistrations().map(row => ({ id: row.id, schoolId: row.schoolId, name: row.nickname, role: 'student', enabled: true }))
}
async function derive(password: string, salt: string) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bytes = Uint8Array.from(salt.match(/../g)!, value => parseInt(value, 16))
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes, iterations: 210000 }, material, 256)))
}
export async function saveRegistration(input: RegisterRequest) {
  if (!globalThis.crypto?.subtle) throw new Error('请使用 HTTPS 或本机预览地址注册账号。')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const row: Registration = { id: 'registered-' + crypto.randomUUID(), schoolId: input.schoolId, account: input.account.trim(), nickname: input.nickname.trim(), phone: input.phone, salt, hash: await derive(input.password, salt) }
  const rows = readRegistrations()
  if (rows.some(value => value.schoolId === row.schoolId && value.account === row.account)) throw new Error('该学校下的账号已注册，请直接登录。')
  try { localStorage.setItem(key, JSON.stringify([...rows, row])) }
  catch { throw new Error('无法保存注册账号，请允许本机存储或释放空间后重试。') }
  return row
}
export async function verifyRegistration(row: Registration, password: string) {
  return await derive(password, row.salt) === row.hash
}
