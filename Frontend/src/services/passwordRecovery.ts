import { httpClient, isDemoMode } from './auth'

// These endpoints are the backend integration contract; no client-side verification bypass.
export const passwordRecovery = {
  async sendCode(input: { schoolId: string; account: string; phone: string }) {
    if (isDemoMode) throw new Error('短信验证服务暂未开通，请联系学校管理员协助找回。')
    const result = await httpClient.request<{ challengeId: string; maskedPhone: string; retryAfter: number }>('/auth/password-recovery/code', { method: 'POST', body: input })
    if (typeof result?.challengeId !== 'string' || !result.challengeId.trim() || typeof result.maskedPhone !== 'string' || !result.maskedPhone.trim() || !Number.isFinite(result.retryAfter) || result.retryAfter < 0) throw new Error('验证服务返回异常，请稍后重试。')
    return result
  },
  async verify(challengeId: string, code: string) {
    const result = await httpClient.request<{ resetToken: string }>('/auth/password-recovery/verify', { method: 'POST', body: { challengeId, code } })
    if (typeof result?.resetToken !== 'string' || !result.resetToken.trim()) throw new Error('身份验证失败，请重新获取验证码。')
    return result.resetToken
  },
  async reset(resetToken: string, password: string) {
    await httpClient.request('/auth/password-recovery/reset', { method: 'POST', body: { resetToken, password } })
  },
}
