const mode = import.meta.env.VITE_API_MODE ?? 'mock'
if (mode !== 'mock' && mode !== 'remote') throw new Error('VITE_API_MODE must be mock or remote')
export const apiConfig = {
  mode,
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
} as const

