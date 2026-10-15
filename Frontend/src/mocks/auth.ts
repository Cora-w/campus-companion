import type { AuthService } from '../api/contracts.ts'
import { ApiError } from '../api/http.ts'
import { initialAccounts } from '../data/data.ts'
import type { Account } from '../types/domain.ts'
import { readRegistrations, registeredAccounts, saveRegistration, verifyRegistration } from './registeredAccounts.ts'
import { registrationError } from '../features/auth/registration.ts'
import { demoSchools } from './schools.ts'
import { createRegistrationCodes } from './registrationCodes.ts'
const defaultSchool = 'sichuan-aerospace-polytechnic'
// Login numbers are scoped by school; internal user ids are globally unique.
export const demoCredentials = [
 { id: 'S-DEMO-01', schoolId: defaultSchool, account: '20260001' },
 { id: 'T-DEMO-01', schoolId: defaultSchool, account: '20261001' },
 { id: 'A-DEMO-01', schoolId: defaultSchool, account: '20262001' },
 { id: 'T-DEMO-02', schoolId: defaultSchool, account: '20261002' },
 { id: 'S-OTHER-01', schoolId: 'qinghe-demo-university', account: '20260001' },
]
let demoAccounts: Account[] = initialAccounts
export function syncDemoAccounts(accounts: Account[]) { demoAccounts = accounts }
const sample = (id: string) => ({ ...demoCredentials.find(item => item.id === id)!, password: 'Demo@2026' })
export const adminDemo = sample('A-DEMO-01')
export const studentDemo = sample('S-DEMO-01')
export const teacherDemo = sample('T-DEMO-01')
export function createMockAuth(getAccounts: () => Account[]): AuthService {
 const codes = createRegistrationCodes()
 const accounts = () => [...getAccounts(), ...registeredAccounts().filter(row => !getAccounts().some(account => account.id === row.id))]
 return {
  async requestRegistrationCode(input) {
   if (!demoSchools.some(school => school.id === input.schoolId)) throw new ApiError('请先选择学校。', 400, 'INVALID_SCHOOL')
   return codes.request(input)
  },
  async login(input) {
   // Legacy sample aliases remain demo-only; both paths must match the school.
   const credential = demoCredentials.find(item => item.schoolId === input.schoolId && (item.account === input.account || item.id === input.account))
   const registration = readRegistrations().find(row => row.schoolId === input.schoolId && row.account === input.account.trim())
   if (registration) {
    const found = accounts().find(row => row.id === registration.id && row.schoolId === input.schoolId)
    if (!found || !await verifyRegistration(registration, input.password)) throw new ApiError('学校、账号或密码不匹配，请检查后重试。', 401, 'INVALID_CREDENTIALS')
    if (!found.enabled) throw new ApiError('该账号已停用，请联系学校管理员。', 403, 'ACCOUNT_DISABLED')
    return { id: found.id, name: found.name, role: found.role, schoolId: found.schoolId, loginAccount: registration.account }
   }
   const found = credential && accounts().find(account => account.id === credential.id && account.schoolId === input.schoolId && ['student', 'teacher', 'admin'].includes(account.role))
   if (!found || !credential || input.password !== studentDemo.password) throw new ApiError('学校、学号或密码不匹配，请检查后重试。', 401, 'INVALID_CREDENTIALS')
   if (!found.enabled) throw new ApiError('该账号已停用，请联系学校管理员。', 403, 'ACCOUNT_DISABLED')
   return { id: found.id, name: found.name, role: found.role, schoolId: found.schoolId, loginAccount: credential.account }
  },
  async register(input) {
   const error = registrationError(input)
   if (error) throw new ApiError(error, 400, 'INVALID_REGISTRATION')
   if (!demoSchools.some(school => school.id === input.schoolId)) throw new ApiError('学校不存在，请重新选择。', 400, 'INVALID_SCHOOL')
   if (demoCredentials.some(row => row.schoolId === input.schoolId && (row.account === input.account.trim() || row.id === input.account.trim())) || accounts().some(row => row.schoolId === input.schoolId && row.id === input.account.trim())) throw new ApiError('该学校下的账号已存在，请直接登录。', 409, 'ACCOUNT_EXISTS')
   const verification = codes.verify(input)
   try {
    const row = await saveRegistration(input)
    verification.complete()
    return { id: row.id, name: row.nickname, schoolId: row.schoolId, role: 'student', loginAccount: row.account }
   } catch (error) { verification.release(); throw error }
  },
  async logout() { /* No server session in demo mode. */ },
 }
}
export const mockAuth = createMockAuth(() => demoAccounts)
