import type { Session } from '../types/domain.ts'

export type LoginRequest = { schoolId: string; account: string; password: string }
export type RegistrationCodeRequest = { schoolId: string; phone: string }
export type RegistrationCodeResponse = { verificationId: string; expiresIn: number; resendAfter: number; demoCode?: string }
export type RegisterRequest = LoginRequest & { nickname: string; phone: string; verificationId: string; verificationCode: string }
export type LoginResponse = { user: Omit<Session, 'name' | 'loginAccount'> & { nickname: string }; accessToken: string }
export type ApiFailure = { code: string; message: string; requestId?: string }
export interface AuthService {
  login(input: LoginRequest): Promise<Session>
  register(input: RegisterRequest): Promise<Session>
  requestRegistrationCode(input: RegistrationCodeRequest): Promise<RegistrationCodeResponse>
  logout(): Promise<void>
}

