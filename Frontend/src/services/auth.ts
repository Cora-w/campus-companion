import { apiConfig } from '../config/env'
import { createRemoteAuth } from '../api/auth'
import { createHttpClient } from '../api/http'
import { mockAuth } from '../mocks/auth'

export const isDemoMode = apiConfig.mode === 'mock'
export const httpClient = createHttpClient(apiConfig.baseUrl)
const provider = isDemoMode ? mockAuth : createRemoteAuth(httpClient)
const loginKey = 'campus-login-v1:' + apiConfig.mode + ':' + apiConfig.baseUrl
export function clearSavedLogin() {
  try { localStorage.removeItem(loginKey) } catch { /* Storage may be unavailable. */ }
  httpClient.setToken(null)
}
export const authService = {
  async register(input: Parameters<typeof provider.register>[0]) {
    clearSavedLogin()
    return provider.register(input)
  },
  async login(input:Parameters<typeof provider.login>[0]) {
    clearSavedLogin()
    return provider.login(input)
  },
  async restore() {
    // Compatibility entry point: remembered login is intentionally disabled.
    clearSavedLogin()
    return null
  },
  async logout() {
    try { await provider.logout() } finally { clearSavedLogin() }
  },
}
