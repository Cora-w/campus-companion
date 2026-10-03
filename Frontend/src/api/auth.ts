import type { AuthService, LoginResponse } from './contracts.ts'
import { ApiError, createHttpClient } from './http.ts'

export function createRemoteAuth(client: ReturnType<typeof createHttpClient>): AuthService {
  return {
    async login(input) {
      client.setToken(null)
      const result = await client.request<LoginResponse>('/auth/login', { method: 'POST', body: input })
      if (!result || typeof result.accessToken !== 'string' || !result.accessToken ||
          !result.user || typeof result.user.id !== 'string' || typeof result.user.name !== 'string' ||
          !['student', 'teacher', 'merchant', 'admin'].includes(result.user.role)) {
        throw new ApiError('登录响应格式不正确，请联系管理员。', 502, 'INVALID_RESPONSE')
      }
      // This release exposes only the student experience. Server authorization is still required.
      if (result.user.role !== 'student') throw new ApiError('当前仅开放学生端。', 403, 'ROLE_NOT_AVAILABLE')
      client.setToken(result.accessToken)
      return result.user
    },
    async logout() {
      try { await client.request<void>('/auth/logout', { method: 'POST' }) }
      finally { client.setToken(null) }
    },
  }
}

