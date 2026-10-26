import apiClient from './client'
import type { PageVersion } from './pages'

export interface VersionListResult {
  versions: PageVersion[]
  total: number
}

// 单行 diff 结果
export interface DiffLine {
  num: number
  text: string
  type: 'unchanged' | 'removed' | 'added'
}

export interface VersionDiff {
  oldVersion: number
  newVersion: number
  oldLines: DiffLine[]
  newLines: DiffLine[]
}

export const versionsApi = {
  // GET /api/versions?page_id=:pageId
  async list(pageId: number): Promise<VersionListResult> {
    return apiClient.get('/versions', { params: { page_id: pageId } })
  },

  // GET /api/versions/:pageId/:version
  async get(pageId: number, version: number): Promise<PageVersion> {
    return apiClient.get(`/versions/${pageId}/${version}`)
  },

  // GET /api/versions/:pageId/diff?old=X&new=Y
  async diff(pageId: number, oldVersion: number, newVersion: number): Promise<VersionDiff> {
    return apiClient.get(`/versions/${pageId}/diff`, { params: { old: oldVersion, new: newVersion } })
  },

  // POST /api/versions/:pageId/:version/restore
  async restore(pageId: number, version: number): Promise<{ success: boolean; page: unknown; message: string }> {
    return apiClient.post(`/versions/${pageId}/${version}/restore`)
  }
}
