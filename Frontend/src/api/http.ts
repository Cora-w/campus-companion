export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  constructor(message: string, status = 0, code = 'NETWORK_ERROR', requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export function createHttpClient(baseUrl: string, fetcher: typeof fetch = fetch, timeoutMs = 15000) {
  let accessToken: string | null = null
  return {
    getToken() { return accessToken },
    setToken(token: string | null) { accessToken = token },
    async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const headers: Record<string, string> = { Accept: 'application/json' }
        if (options.body !== undefined) headers['Content-Type'] = 'application/json'
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`
        const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`, {
          method: options.method ?? 'GET', headers, signal: controller.signal,
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
          credentials: 'omit',
        })
        if (response.status === 401) accessToken = null
        if (response.status === 204 && response.ok) return undefined as T
        let body: unknown
        try { body = await response.json() } catch {
          throw new ApiError('服务返回格式异常，请稍后重试。', response.status, 'INVALID_RESPONSE')
        }
        if (!response.ok) {
          const error = body && typeof body === 'object' ? body as Record<string, unknown> : {}
          throw new ApiError(typeof error.message === 'string' ? error.message : '请求失败，请稍后重试。', response.status,
            typeof error.code === 'string' ? error.code : 'HTTP_ERROR', typeof error.requestId === 'string' ? error.requestId : undefined)
        }
        return body as T
      } catch (error) {
        if (error instanceof ApiError) throw error
        throw new ApiError(controller.signal.aborted ? '请求超时，请重试。' : '无法连接服务器，请检查网络。', 0,
          controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR')
      } finally { clearTimeout(timeout) }
    },
  }
}

