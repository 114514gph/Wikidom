// 图片代理接口 - 代理 Fandom 的图片，避免跨域和加载问题
// 路径: /api/proxy/image?url=https://static.wikia.nocookie.net/xxx

const ALLOWED_DOMAINS = [
  'static.wikia.nocookie.net',
  'static.wikia.nocookie.com',
  'vignette.wikia.nocookie.net'
]

export async function onRequestGet(context) {
  const url = new URL(context.request.url)
  const imageUrl = url.searchParams.get('url')

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }

  // 校验域名，防止 SSRF
  try {
    const parsed = new URL(imageUrl)
    if (!ALLOWED_DOMAINS.some(d => parsed.hostname.endsWith(d))) {
      return new Response('Domain not allowed', { status: 403 })
    }
  } catch {
    return new Response('Invalid url', { status: 400 })
  }

  try {
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Wikidom/1.0 (Image Proxy)'
      },
      cf: {
        cacheTtl: 86400, // 缓存 1 天
        cacheEverything: true
      }
    })

    if (!resp.ok) {
      return new Response(`Image fetch failed: ${resp.status}`, { status: resp.status })
    }

    // 复制响应，加上 CORS 头和缓存头
    const newResp = new Response(resp.body, resp)
    newResp.headers.set('Access-Control-Allow-Origin', '*')
    newResp.headers.set('Cache-Control', 'public, max-age=86400')
    return newResp
  } catch (e) {
    return new Response(`Proxy error: ${e.message}`, { status: 502 })
  }
}
