import type { ReactNode } from 'react'
import type { Session } from '../../types/domain'
import { Icon } from '../../components/shared/Shared'
import { SchoolContext } from './SchoolContext'
import './SchoolGate.css'
export function SchoolGate({ session, children }: { session: Session; logout: () => Promise<void>; children: ReactNode }) {
 const school = { id: session.schoolId, name: session.schoolName || '我的学校', city: session.schoolCity || '' }
 return <SchoolContext.Provider value={school}><div className="bound-school" aria-label="当前学校"><span className="bound-school-identity"><span className="bound-school-location"><Icon name="location"/></span><strong title={school.name}>{school.name}</strong></span><span className="bound-school-label">我的学校</span></div>{children}</SchoolContext.Provider>
}
