import apiClient from './client'

// 站点配置键值对象（key -> value）
export type SiteConfig = Record<string, string>

export const siteConfigApi = {
  // GET /api/site-config
  async get(): Promise<SiteConfig> {
    return apiClient.get('/site-config')
  },

  // PUT /api/site-config — 管理员批量更新
  async update(config: SiteConfig): Promise<{ success: boolean; message: string; updated: string[] }> {
    return apiClient.put('/site-config', config)
  }
}
