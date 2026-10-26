import apiClient from './client'

// 图片上传响应
export interface UploadResult {
  url: string
  filename: string
  mime: string
}

// 上传 API 封装
// 后端接收 { filename, content(base64), mime }，返回 { url, filename, mime }
export const uploadApi = {
  // 上传一张图片，返回可在 Wiki 中引用的 raw 地址
  async uploadImage(filename: string, contentBase64: string, mime: string): Promise<UploadResult> {
    return apiClient.post('/upload', {
      filename,
      content: contentBase64,
      mime,
    })
  },
}

// 工具函数：将 File 对象读取为不含 data URI 前缀的纯 base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // result 形如 data:image/png;base64,xxxx，去掉前缀
      const result = String(reader.result || '')
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.substring(idx + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
