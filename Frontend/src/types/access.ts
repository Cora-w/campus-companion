export const campusRoles = ['student', 'teacher', 'admin'] as const
export type CampusRole = typeof campusRoles[number]
export function isCampusRole(role: string | undefined | null): role is CampusRole { return campusRoles.some(value => value === role) }
