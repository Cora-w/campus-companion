export const blacklistKey = (schoolId: string, userId: string) => 'campus-blacklist-v1:' + JSON.stringify([schoolId, userId])
export function readBlacklist(storage: Pick<Storage, 'getItem'>, key: string): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) || '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && !!id))] : []
  } catch { return [] }
}
export function changeBlacklist(ids: string[], id: string, blocked: boolean) {
  return blocked ? [...new Set([...ids, id])] : ids.filter(value => value !== id)
}
