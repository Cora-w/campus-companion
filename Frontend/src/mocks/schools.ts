import type { School } from '../types/school'

// The existing campus content is a single fictional school's demo dataset.
export const demoSchools: School[] = [{ id: 'sichuan-aerospace-polytechnic', name: '四川航天职业技术学院', city: '四川省'  }]
const key = (userId: string) => `campus-school-v1:${encodeURIComponent(userId)}`
export function readDemoSchool(userId: string): School | null {
  const id = localStorage.getItem(key(userId))
  return demoSchools.find(school => school.id === id) ?? null
}
export function bindDemoSchool(userId: string, schoolId: string): School {
  const school = demoSchools.find(item => item.id === schoolId)
  if (!school) throw new Error('学校不存在或暂未开放，请重新选择。')
  const existing = readDemoSchool(userId)
  if (existing && existing.id !== school.id) throw new Error('已绑定学校，请联系管理员修改。')
  // Fail closed if persistence is unavailable: do not claim the binding succeeded.
  localStorage.setItem(key(userId), school.id)
  return school
}
