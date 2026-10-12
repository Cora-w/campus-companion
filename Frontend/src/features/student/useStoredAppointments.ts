import { useEffect, useState } from 'react'
import type { Appointment } from '../teacher/workspaceModel'
import { demoAppointments } from '../teacher/workspaceModel'

export const appointmentStorageKey = 'campus-demo-appointments-v1'
function readStored(raw: string | null): Appointment[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    const legacy = Array.isArray(parsed)
    const items = legacy ? parsed : parsed && typeof parsed === 'object' && 'version' in parsed && parsed.version === 1 && 'appointments' in parsed ? parsed.appointments : null
    if (!Array.isArray(items) || !items.every(item => item && typeof item === 'object' && ['id', 'caseId', 'teacherId', 'day', 'start', 'method', 'location'].every(key => typeof item[key] === 'string') && [30, 45, 60].includes(item.duration) && ['已安排', '已完成', '未到访', '已取消'].includes(item.status))) return null
    const appointments = items as Appointment[]
    // Add the example once when upgrading an earlier browser demo.
    return legacy && !appointments.some(item => item.id === 'APT-STUDENT-EXAMPLE') ? [demoAppointments[0], ...appointments] : appointments
  } catch { return null }
}
export function useStoredAppointments(enabled: boolean) {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (!enabled) return demoAppointments.filter(item => !item.example)
    try { return readStored(localStorage.getItem(appointmentStorageKey)) ?? demoAppointments } catch { return demoAppointments }
  })
  useEffect(() => {
    if (!enabled) return
    try {
      const next = JSON.stringify({ version: 1, appointments })
      if (localStorage.getItem(appointmentStorageKey) !== next) localStorage.setItem(appointmentStorageKey, next)
    } catch { /* The current session still works when browser storage is unavailable. */ }
  }, [appointments, enabled])
  useEffect(() => {
    if (!enabled) return
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || event.key !== appointmentStorageKey) return
      const next = readStored(event.newValue)
      if (next) setAppointments(next)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [enabled])
  return [appointments, setAppointments] as const
}
