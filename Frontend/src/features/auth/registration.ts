import type { RegisterRequest } from '../../api/contracts.ts'

export function registrationError(input: RegisterRequest) {
  if (!input.schoolId) return '请选择学校。'
  if (!/^[A-Za-z0-9_\-.]{4,32}$/.test(input.account.trim())) return '账号需为 4–32 位字母、数字、下划线、点或短横线。'
  if (input.nickname.trim().length < 2 || input.nickname.trim().length > 20) return '昵称需为 2–20 个字。'
  if (input.password.length < 8 || input.password.length > 64 || !/[A-Za-z]/.test(input.password) || !/[0-9]/.test(input.password)) return '密码需为 8–64 位，包含字母和数字。'
  return ''
}
