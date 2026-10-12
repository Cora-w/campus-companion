export type Role = 'student' | 'teacher' | 'admin' | 'merchant'
export type Session = { role: Role; name: string; id: string }
export type Risk = '高' | '中' | '低'
export type CaseStatus = '待处理' | '跟进中' | '已归档'
export type CareRecord = { id: string; date: string; method: string; summary: string; plan: string; nextDate: string; response?: string; appointmentId?: string }
export type CareCase = { id: string; student: string; studentId: string; studentAccountId?: string; observation?: { note: string; nextDate: string; time: string }; group: string; risk: Risk; topic: string; time: string; status: CaseStatus; records: CareRecord[]; teacherId?: string; source?: string; summary?: string; signals?: string[]; trend?: MoodEntry[]; review?: { conclusion: string; note: string; time: string }; closure?: { note: string; time: string }; escalations?: { id: string; reason: string; recipient: string; time: string; acknowledged: boolean }[] }
export type Account = { id: string; name: string; role: Role; enabled: boolean; shopManagement?: boolean }
export type Audit = { id: string; time: string; actor: string; action: string }
export type MoodEntry = { id: string; day: string; mood: number; stress: number; note: string }
export type Report = { id: string; title: string; period: string; state: '可查阅' | '生成中'; summary: string }


