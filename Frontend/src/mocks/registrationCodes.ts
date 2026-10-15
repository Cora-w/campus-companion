import type { RegistrationCodeRequest, RegistrationCodeResponse, RegisterRequest } from '../api/contracts.ts'

// Demo only: no SMS leaves the device. Production verification is performed by the server.
export function createRegistrationCodes(now = () => Date.now()) {
  const challenges = new Map<string, { schoolId: string; phone: string; code: string; expires: number; attempts: number; busy: boolean }>()
  const cooldown = new Map<string, number>()
  return {
    request(input: RegistrationCodeRequest): RegistrationCodeResponse {
      if (!/^1[3-9]\d{9}$/.test(input.phone)) throw new Error('请输入正确的中国大陆 11 位手机号。')
      const key = JSON.stringify([input.schoolId, input.phone])
      if ((cooldown.get(key) || 0) > now()) throw new Error('验证码获取过于频繁，请稍后重试。')
      for (const [id, value] of challenges) if (value.expires <= now() || (value.schoolId === input.schoolId && value.phone === input.phone)) challenges.delete(id)
      const verificationId = crypto.randomUUID()
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
      challenges.set(verificationId, { ...input, code, expires: now() + 300000, attempts: 0, busy: false })
      cooldown.set(key, now() + 60000)
      return { verificationId, expiresIn: 300, resendAfter: 60, demoCode: code }
    },
    verify(input: RegisterRequest) {
      const value = challenges.get(input.verificationId)
      if (!value || value.expires <= now()) throw new Error('验证码已失效，请重新获取。')
      if (value.schoolId !== input.schoolId || value.phone !== input.phone) throw new Error('手机号或学校已更换，请重新获取验证码。')
      if (value.busy) throw new Error('验证码正在使用，请勿重复提交。')
      if (value.attempts >= 5) throw new Error('验证码错误次数过多，请重新获取。')
      if (value.code !== input.verificationCode) { value.attempts++; throw new Error('验证码不正确，请重新输入。') }
      value.busy = true
      return { complete: () => challenges.delete(input.verificationId), release: () => { value.busy = false } }
    },
  }
}
