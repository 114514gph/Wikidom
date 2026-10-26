import apiClient from './client'

export interface Page {
  id: number
  title: string
  namespace: string
  slug: string
  content: string
  syntax: string
  creator_id: number
  is_redirect: number
  redirect_target: string | null
  is_protected: number
  protection_level: string | null
  created_at: string
  updated_at: string
}

export interface PageVersion {
  id: number
  page_id: number
  version: number
  content: string
  syntax: string
  edit_summary: string | null
  editor_id: number
  is_minor: number
  created_at: string
}

export interface PageListParams {
  namespace?: string
  category?: string
  tag?: string
  search?: string
  page?: number
  limit?: number
  sort?: 'updated' | 'created' | 'title'
  order?: 'asc' | 'desc'
}

export const pagesApi = {
  async get(slug: string, namespace = 'main'): Promise<Page> {
    return apiClient.get(`/pages/${namespace}/${slug}`)
  },

  async list(params: PageListParams = {}): Promise<{ pages: Page[]; total: number }> {
    return apiClient.get('/pages', { params })
  },

  async create(data: { title: string; namespace?: string; content?: string; syntax?: string }): Promise<Page> {
    return apiClient.post('/pages', data)
  },

  async update(id: number, data: { content?: string; title?: string; editSummary?: string; isMinor?: boolean }): Promise<Page> {
    return apiClient.put(`/pages/${id}`, data)
  },

  async remove(id: number): Promise<void> {
    return apiClient.delete(`/pages/${id}`)
  },

  // 保护/取消保护页面（管理员）
  async protect(id: number, protectedFlag: boolean, level: 'edit' | 'move' | 'all' = 'all'): Promise<{ success: boolean; message: string; page: Page }> {
    return apiClient.post(`/pages/${id}/protect`, { protected: protectedFlag, level })
  },

  async restore(id: number): Promise<void> {
    return apiClient.post(`/pages/${id}/restore`)
  },

  async versions(pageId: number): Promise<PageVersion[]> {
    return apiClient.get(`/pages/${pageId}/versions`)
  },

  async revert(pageId: number, versionId: number): Promise<Page> {
    return apiClient.post(`/pages/${pageId}/revert`, { versionId })
  },

  async diff(pageId: number, fromVersion: number, toVersion: number): Promise<{ from: string; to: string; diff: string }> {
    return apiClient.get(`/pages/${pageId}/diff`, { params: { from: fromVersion, to: toVersion } })
  },

  async categories(pageId: number): Promise<{ id: number; name: string }[]> {
    return apiClient.get(`/pages/${pageId}/categories`)
  },

  async addCategory(pageId: number, categoryName: string): Promise<void> {
    return apiClient.post(`/pages/${pageId}/categories`, { name: categoryName })
  },

  async removeCategory(pageId: number, categoryId: number): Promise<void> {
    return apiClient.delete(`/pages/${pageId}/categories/${categoryId}`)
  }
}
