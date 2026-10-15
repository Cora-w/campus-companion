import type { Session } from '../types/domain.ts'

export type LoginRequest = { schoolId: string; account: string; password: string }
export type RegisterRequest = LoginRequest & { nickname: string }
export type LoginResponse = { user: Omit<Session, 'name' | 'loginAccount'> & { nickname: string }; accessToken: string }
export type ApiFailure = { code: string; message: string; requestId?: string }
export interface AuthService {
  login(input: LoginRequest): Promise<Session>
  register(input: RegisterRequest): Promise<Session>
  logout(): Promise<void>
}

