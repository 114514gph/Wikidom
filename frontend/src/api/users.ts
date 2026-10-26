import apiClient from './client'

// 后端 /api/users/* 返回的公开用户对象（数据库 snake_case 字段）
export interface PublicUser {
  id: number
  username: string
  email?: string
  display_name?: string
  avatar_url?: string | null
  bio?: string | null
  role: string
  is_banned?: number
  ban_reason?: string | null
  created_at?: string
  last_login_at?: string | null
}

export interface UpdateUserInput {
  display_name?: string
  bio?: string
  avatar_url?: string
}

// 管理员修改用户：角色 / 封禁
export interface AdminUpdateUserInput {
  role?: 'admin' | 'moderator' | 'user'
  is_banned?: boolean
  ban_reason?: string
}

export interface UserListResult {
  users: PublicUser[]
  total: number
  page: number
  limit: number
}

export const usersApi = {
  async get(username: string): Promise<PublicUser> {
    return apiClient.get(`/users/${encodeURIComponent(username)}`)
  },

  async list(page = 1, limit = 20): Promise<UserListResult> {
    return apiClient.get('/users', { params: { page, limit } })
  },

  async update(id: number, data: UpdateUserInput): Promise<PublicUser> {
    return apiClient.put(`/users/${id}`, data)
  },

  // 管理员：修改角色 / 设置封禁
  async adminUpdate(id: number, data: AdminUpdateUserInput): Promise<PublicUser> {
    return apiClient.put(`/users/${id}`, data)
  }
}
