import apiClient from './client'

export interface TrashItem {
  id: number
  page_id: number
  page_title: string
  deleted_by: number
  deleted_by_name?: string
  deleted_at: string
  reason?: string | null
}

export interface TrashListResult {
  items: TrashItem[]
  total: number
  page: number
  limit: number
}

export const trashApi = {
  async list(page = 1, limit = 20): Promise<TrashListResult> {
    return apiClient.get('/trash', { params: { page, limit } })
  },

  async restore(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/trash/${id}/restore`)
  },

  // 永久删除，需要管理员权限
  async remove(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/trash/${id}`)
  }
}
