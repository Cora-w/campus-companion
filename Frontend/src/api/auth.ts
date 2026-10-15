import type { AuthService, LoginResponse } from './contracts.ts'
import { ApiError, createHttpClient } from './http.ts'
import { registrationError } from '../features/auth/registration.ts'

export function createRemoteAuth(client: ReturnType<typeof createHttpClient>): AuthService {
  return {
    async register(input) {
      client.setToken(null)
      const error = registrationError(input)
      if (error) throw new ApiError(error, 400, 'INVALID_REGISTRATION')
      const result = await client.request<LoginResponse>('/auth/register', { method: 'POST', body: { schoolId: input.schoolId, account: input.account.trim(), nickname: input.nickname.trim(), password: input.password } })
      if (!result || typeof result.accessToken !== 'string' || !result.accessToken || !result.user || typeof result.user.id !== 'string' || !result.user.id.trim() || typeof result.user.nickname !== 'string' || !result.user.nickname.trim() || result.user.schoolId !== input.schoolId || result.user.role !== 'student') throw new ApiError('注册响应格式不正确，请联系管理员。', 502, 'INVALID_RESPONSE')
      client.setToken(result.accessToken)
      return { id: result.user.id, name: result.user.nickname, role: result.user.role, schoolId: result.user.schoolId, loginAccount: input.account.trim(), avatar: typeof result.user.avatar === 'string' ? result.user.avatar : '' }
    },
    async login(input) {
      client.setToken(null)
      if (!input.schoolId?.trim() || !input.account?.trim() || !input.password) throw new ApiError('请选择学校并填写学号和密码。', 400, 'INVALID_LOGIN')
      const result = await client.request<LoginResponse>('/auth/login', { method: 'POST', body: { schoolId: input.schoolId, account: input.account.trim(), password: input.password } })
      if (!result || typeof result.accessToken !== 'string' || !result.accessToken ||
          !result.user || typeof result.user.id !== 'string' || !result.user.id.trim() || typeof result.user.nickname !== 'string' || !result.user.nickname.trim() || result.user.schoolId !== input.schoolId ||
          !['student', 'teacher', 'merchant', 'admin'].includes(result.user.role)) {
        throw new ApiError('登录响应格式不正确，请联系管理员。', 502, 'INVALID_RESPONSE')
      }
      // Role comes from the authenticated server response, never the login selector.
      if (!['student', 'teacher', 'admin'].includes(result.user.role)) throw new ApiError('该身份暂未开放，请联系管理员。', 403, 'ROLE_NOT_AVAILABLE')
      client.setToken(result.accessToken)
      return { id: result.user.id, name: result.user.nickname, role: result.user.role, schoolId: result.user.schoolId, loginAccount: input.account.trim(), avatar: typeof result.user.avatar === 'string' ? result.user.avatar : '' }
    },
    async logout() {
      try { await client.request<void>('/auth/logout', { method: 'POST' }) }
      finally { client.setToken(null) }
    },
  }
}

