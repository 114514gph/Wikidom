import apiClient from './client'

export type Syntax = 'mediawiki' | 'wikidot' | 'markdown'

export const parseApi = {
  // POST /api/parse/render  -> 渲染为 HTML
  async render(content: string, syntax: Syntax = 'markdown'): Promise<{ html: string }> {
    return apiClient.post('/parse/render', { content, syntax })
  },

  // POST /api/parse/convert  -> 语法间转换
  async convert(content: string, from: Syntax, to: Syntax): Promise<{ content: string }> {
    return apiClient.post('/parse/convert', { content, from, to })
  },

  // POST /api/parse/ast  -> 获取抽象语法树
  async ast(content: string, syntax: Syntax = 'markdown'): Promise<{ ast: unknown }> {
    return apiClient.post('/parse/ast', { content, syntax })
  }
}
