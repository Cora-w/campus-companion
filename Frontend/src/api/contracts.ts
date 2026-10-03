import type { Session } from '../types/domain.ts'

export type LoginRequest = { account: string; password: string }
export type LoginResponse = { user: Session; accessToken: string }
export type ApiFailure = { code: string; message: string; requestId?: string }
export interface AuthService {
  login(input: LoginRequest): Promise<Session>
  logout(): Promise<void>
}

