import apiClient from './client'

// 单条搜索结果（title/snippet 中已由后端用 <mark> 包裹匹配词）
export interface SearchResult {
  id: number
  title: string
  namespace: string
  slug: string
  snippet: string
  updated_at: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export const searchApi = {
  // 全站搜索：在标题与正文中匹配关键词
  async search(q: string, limit = 20): Promise<SearchResponse> {
    return apiClient.get('/search', { params: { q, limit } })
  }
}
