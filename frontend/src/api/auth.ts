import apiClient from './client'
import type { User } from '@/stores/user'

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  async login(username: string, password: string): Promise<AuthResponse> {
    return apiClient.post('/auth/login', { username, password })
  },

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    return apiClient.post('/auth/register', { username, email, password })
  },

  async me(): Promise<User> {
    return apiClient.get('/auth/me')
  },

  async logout(): Promise<void> {
    return apiClient.post('/auth/logout')
  }
}
