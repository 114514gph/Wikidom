import apiClient from './client'

// 后端返回的评论树节点（snake_case 字段）
export interface CommentNode {
  id: number
  parent_id: number | null
  user_id: number
  content: string
  is_deleted: number
  created_at: string
  username: string
  display_name: string | null
  avatar_url: string | null
  replies: CommentNode[]
}

export interface CommentListResult {
  comments: CommentNode[]
  total: number
}

export const commentsApi = {
  // GET /api/comments?page_id=X
  async list(pageId: number): Promise<CommentListResult> {
    return apiClient.get('/comments', { params: { page_id: pageId } })
  },

  // POST /api/comments — 发表评论或回复
  async create(data: { page_id: number; content: string; parent_id?: number | null }): Promise<{ success: boolean; comment: CommentNode }> {
    return apiClient.post('/comments', data)
  },

  // DELETE /api/comments/:id — 软删除
  async remove(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/comments/${id}`)
  }
}
