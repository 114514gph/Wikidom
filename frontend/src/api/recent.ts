import apiClient from './client'

// 单条最近更改记录
export interface RecentChange {
  page_id: number
  title: string
  namespace: string
  slug: string
  editor_name: string
  edit_summary: string | null
  created_at: string
  version: number
}

export interface RecentChangesResponse {
  changes: RecentChange[]
  total: number
}

export const recentApi = {
  // 获取最近编辑记录（默认 50 条）
  async list(limit = 50): Promise<RecentChangesResponse> {
    return apiClient.get('/recent', { params: { limit } })
  }
}
