import type { School } from '../types/school'
import { bindDemoSchool, demoSchools, readDemoSchool } from '../mocks/schools'
import { httpClient, isDemoMode } from './auth'

function parseSchool(value: unknown): School {
  if (!value || typeof value !== 'object') throw new Error('学校信息异常，请重试。')
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || !item.id.trim() || typeof item.name !== 'string' || !item.name.trim() || typeof item.city !== 'string')
    throw new Error('学校信息异常，请重试。')
  return { id: item.id, name: item.name, city: item.city }
}
export const schoolService = {
  async current(userId: string): Promise<School | null> {
    if (isDemoMode) return readDemoSchool(userId)
    const value = await httpClient.request<unknown>('/users/me/school')
    return value === null ? null : parseSchool(value)
  },
  async list(): Promise<School[]> {
    if (isDemoMode) return demoSchools
    const value = await httpClient.request<unknown>('/schools')
    if (!Array.isArray(value)) throw new Error('学校列表异常，请重试。')
    return value.map(parseSchool)
  },
  async bind(userId: string, schoolId: string): Promise<School> {
    if (isDemoMode) return bindDemoSchool(userId, schoolId)
    const school = parseSchool(await httpClient.request<unknown>('/users/me/school', { method: 'PUT', body: { schoolId } }))
    if (school.id !== schoolId) throw new Error('绑定结果与所选学校不一致，请重试。')
    return school
  },
}
