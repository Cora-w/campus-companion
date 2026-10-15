import { createContext, useContext } from 'react'
import type { School } from '../../types/school'
export const SchoolContext = createContext<School | null>(null)
export function useSchool() { return useContext(SchoolContext) }
