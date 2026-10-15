import type { PrivateIdentity } from '../features/identity/identityModel'
// Fictional protected fixtures. Production must request only authorized identities.
export const demoStudentIdentities: PrivateIdentity[] = [
  { userId: 'S-DEMO-01', schoolId: 'sichuan-aerospace-polytechnic', realName: '陈禾（虚构）', studentNumber: '20260001', schoolDetails: { college: '计算机学院', major: '计算机专业', grade: '2026级', className: '一班' } },
  { userId: 'S-OTHER-01', schoolId: 'qinghe-demo-university', realName: '林雨（虚构）', studentNumber: '20260001', schoolDetails: { college: '', major: '', grade: '', className: '' } },
]
