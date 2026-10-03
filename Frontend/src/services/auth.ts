import { apiConfig } from '../config/env'
import { createRemoteAuth } from '../api/auth'
import { createHttpClient } from '../api/http'
import { mockAuth } from '../mocks/auth'

export const isDemoMode = apiConfig.mode === 'mock'
export const httpClient = createHttpClient(apiConfig.baseUrl)
export const authService = isDemoMode ? mockAuth : createRemoteAuth(httpClient)

