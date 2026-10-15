import type { AuthService } from '../api/contracts'
import { ApiError } from '../api/http.ts'
import { initialAccounts, roleSessions } from '../data/data.ts'

import type { Account } from '../types/domain'

let demoAccounts: Account[] = initialAccounts
export function syncDemoAccounts(accounts: Account[]) { demoAccounts = accounts }
export const adminDemo = { account: roleSessions.admin.id, password: 'Demo@2026' }
export const studentDemo = { account: roleSessions.student.id, password: 'Demo@2026' }
export const teacherDemo = { account: roleSessions.teacher.id, password: 'Demo@2026' }
// Public local-demo verifier only; production roles and credentials come from the backend.
// Client-side password checks are not a security boundary.
const localAdminId = '3343625681'
const localAdminSalt = 'f311fc813f7fcab61553644021cc8c16'
const localAdminVerifier = '689af7dca1d236b63ce3067793c43391b8f269146a6de6257cc5c03c53cde893'
async function matchesDemoPassword(account: string, password: string) {
  if (account !== localAdminId) return password === studentDemo.password
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const salt = Uint8Array.from(localAdminSalt.match(/.{2}/g)!, byte => parseInt(byte, 16))
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256)
  const verifier = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('')
  return verifier === localAdminVerifier
}
export const mockAuth: AuthService = {
  async login(input) {
    const found = demoAccounts.find(account => account.id === input.account && ['student', 'teacher', 'admin'].includes(account.role))
    if (!found || !initialAccounts.some(account => account.id === found.id) || !await matchesDemoPassword(found.id, input.password))
      throw new ApiError('账号或密码不匹配，请检查后重试。', 401, 'INVALID_CREDENTIALS')
    if (!found.enabled) throw new ApiError('该账号已停用，请联系学校管理员。', 403, 'ACCOUNT_DISABLED')
    return { id: found.id, name: found.name, role: found.role }
  },
  async logout() { /* No server session in demo mode. */ },
}

