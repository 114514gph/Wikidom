import apiClient from './client'

export interface Category {
  id: number
  name: string
  parent_id: number | null
  page_count: number
  createdAt?: string
}

export interface CategoryDetail {
  category: Category
  pages: unknown[]
  subcategories: Category[]
}

export interface CategoryListResult {
  categories: Category[]
  total: number
  page: number
  limit: number
}

export const categoriesApi = {
  async list(page = 1, limit = 50): Promise<CategoryListResult> {
    return apiClient.get('/categories', { params: { page, limit } })
  },

  async get(name: string): Promise<CategoryDetail> {
    return apiClient.get(`/categories/${encodeURIComponent(name)}`)
  },

  // 创建空分类
  async create(name: string, description = ''): Promise<{ success: boolean; category: Category; message: string }> {
    return apiClient.post('/categories', { name, description })
  },

  // 删除分类（管理员）
  async remove(name: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/categories/${encodeURIComponent(name)}`)
  },

  async addPage(pageId: number, categoryName: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`/categories/${encodeURIComponent(categoryName)}/pages`, { page_id: pageId })
  }
}
