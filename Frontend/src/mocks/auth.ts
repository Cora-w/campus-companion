import type { AuthService } from '../api/contracts'
import { ApiError } from '../api/http'
import { initialAccounts, roleSessions } from '../data/data'

import type { Account } from '../types/domain'

let demoAccounts: Account[] = initialAccounts
export function syncDemoAccounts(accounts: Account[]) { demoAccounts = accounts }
export const adminDemo = { account: roleSessions.admin.id, password: 'Demo@2026' }
export const studentDemo = { account: roleSessions.student.id, password: 'Demo@2026' }
export const teacherDemo = { account: roleSessions.teacher.id, password: 'Demo@2026' }
export const mockAuth: AuthService = {
  async login(input) {
    const found = demoAccounts.find(account => account.id === input.account && ['student', 'teacher', 'admin'].includes(account.role))
    if (!found || !initialAccounts.some(account => account.id === found.id) || input.password !== studentDemo.password)
      throw new ApiError('账号或密码不匹配，请检查后重试。', 401, 'INVALID_CREDENTIALS')
    if (!found.enabled) throw new ApiError('该账号已停用，请联系学校管理员。', 403, 'ACCOUNT_DISABLED')
    return { id: found.id, name: found.name, role: found.role }
  },
  async logout() { /* No server session in demo mode. */ },
}

