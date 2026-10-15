import type { School } from '../types/school'
import { demoSchools } from '../mocks/schools'
import { httpClient, isDemoMode } from './auth'

function parseSchool(value: unknown): School {
  if (!value || typeof value !== 'object') throw new Error('学校信息异常，请重试。')
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || !item.id.trim() || typeof item.name !== 'string' || !item.name.trim() || typeof item.city !== 'string')
    throw new Error('学校信息异常，请重试。')
  return { id: item.id, name: item.name, city: item.city }
}
export const schoolService = {
  async list(): Promise<School[]> {
    if (isDemoMode) return demoSchools
    const value = await httpClient.request<unknown>('/schools')
    if (!Array.isArray(value)) throw new Error('学校列表异常，请重试。')
    return value.map(parseSchool)
  },
}
