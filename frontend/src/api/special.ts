import apiClient from './client'

export interface PageListItem {
  id: number
  title: string
  namespace: string
  slug: string
  created_at?: string
  updated_at?: string
  updatedAt?: string
}

export interface AllPagesParams {
  namespace?: string
  prefix?: string
  limit?: number
  offset?: number
}

export interface AllPagesResult {
  pages: PageListItem[]
  total: number
}

export interface RandomPageResult {
  slug: string
  namespace: string
  title: string
}

export interface UserStatItem {
  id: number
  username: string
  displayName?: string
  display_name?: string
  avatarUrl?: string
  avatar_url?: string
  role: string
  createdAt?: string
  created_at?: string
  editCount?: number
  edit_count?: number
}

export interface UsersResult {
  users: UserStatItem[]
  total: number
}

export interface ContributionItem {
  pageId?: number
  page_id?: number
  title: string
  namespace: string
  slug: string
  editorName?: string
  editor_name?: string
  editSummary?: string
  edit_summary?: string | null
  createdAt?: string
  created_at?: string
  version: number
}

export interface ContributionsResult {
  changes: ContributionItem[]
  total: number
}

export interface CreatedPageItem {
  id: number
  title: string
  namespace: string
  slug: string
  created_at: string
  updated_at: string
}

export interface CreatedPageResult {
  pages: CreatedPageItem[]
  total: number
}

export const specialApi = {
  /** Special:AllPages - 按标题字母序列出页面 */
  async allPages(params: AllPagesParams = {}): Promise<AllPagesResult> {
    return apiClient.get('/special/allpages', { params })
  },

  /** Special:Random - 随机跳转一个未删除页面 */
  async random(namespace = 'main'): Promise<RandomPageResult> {
    return apiClient.get('/special/random', { params: { namespace } })
  },

  /** Special:ListUsers - 用户列表 */
  async listUsers(params: { limit?: number; offset?: number } = {}): Promise<UsersResult> {
    return apiClient.get('/special/users', { params })
  },

  /** Special:Contributions - 某用户的全部编辑记录 */
  async contributions(username: string, params: { limit?: number; offset?: number } = {}): Promise<ContributionsResult> {
    return apiClient.get('/special/contributions', { params: { username, ...params } })
  },

  /** Special:Created - 某用户创建的全部页面 */
  async created(username: string, params: { limit?: number; offset?: number } = {}): Promise<CreatedPageResult> {
    return apiClient.get('/special/created', { params: { username, ...params } })
  }
}
