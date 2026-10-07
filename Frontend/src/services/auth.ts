import type { Session } from '../types/domain'
import { initialAccounts } from '../data/data'
import { studentDemo } from '../mocks/auth'
import { ApiError } from '../api/http'
import { apiConfig } from '../config/env'
import { createRemoteAuth } from '../api/auth'
import { createHttpClient } from '../api/http'
import { mockAuth } from '../mocks/auth'

export const isDemoMode = apiConfig.mode === 'mock'
export const httpClient = createHttpClient(apiConfig.baseUrl)
const provider = isDemoMode ? mockAuth : createRemoteAuth(httpClient)
const loginKey = 'campus-login-v1:' + apiConfig.mode + ':' + apiConfig.baseUrl
const lifetime = 30 * 24 * 60 * 60 * 1000
export function clearSavedLogin() {
  try { localStorage.removeItem(loginKey) } catch { /* Storage may be unavailable. */ }
  httpClient.setToken(null)
}
export const authService = {
  async login(input:Parameters<typeof provider.login>[0]) {
    const user = await provider.login(input)
    try { localStorage.setItem(loginKey, JSON.stringify({id:user.id,token:isDemoMode?undefined:httpClient.getToken(),expires:Date.now()+lifetime})) } catch { /* Login still works for this visit. */ }
    return user
  },
  async restore() {
    let saved: {id?:string;token?:string;expires?:number}
    try { saved = JSON.parse(localStorage.getItem(loginKey) || 'null') } catch { clearSavedLogin(); return null }
    if (!saved) return null
    if (typeof saved.expires !== 'number' || saved.expires <= Date.now()) { clearSavedLogin(); return null }
    if (isDemoMode) {
      const account = initialAccounts.find(a => a.id === saved.id && a.id === studentDemo.account && a.enabled && a.role === 'student')
      if (!account) { clearSavedLogin(); return null }
      return {id:account.id,name:account.name,role:account.role}
    }
    if (typeof saved.token !== 'string' || !saved.token) { clearSavedLogin(); return null }
    httpClient.setToken(saved.token)
    try {
      const user = await httpClient.request<Session>('/auth/me')
      if (!user || user.id !== saved.id || typeof user.name !== 'string' || user.role !== 'student') { clearSavedLogin(); return null }
      return user
    } catch (error) {
      if (error instanceof ApiError && [401,403].includes(error.status)) { clearSavedLogin(); return null }
      throw error
    }
  },
  async logout() {
    try { await provider.logout() } finally { clearSavedLogin() }
  },
}
