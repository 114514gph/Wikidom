// 命名空间工具 - 前后端共用的命名空间约定
// 规范命名空间 key 与标题前缀：
//   main      无前缀        → /wiki/:slug
//   template  Template:    → /wiki/Template:Name
//   help      Help:        → /wiki/Help:Name
//   category  Category:    → /category/:slug
//   user      User:        → /user/:username
//   user_talk User talk:   → /user/:username/talk
//   talk      （主条目讨论） → /wiki/:slug/discussion
//   special   Special:     → /special/:page

export interface NamespaceDef {
  /** 标题前缀（main 为空字符串） */
  prefix: string
  /** 中文显示名 */
  label: string
}

export const NAMESPACES: Record<string, NamespaceDef> = {
  main: { prefix: '', label: '条目' },
  template: { prefix: 'Template:', label: '模板' },
  help: { prefix: 'Help:', label: '帮助' },
  category: { prefix: 'Category:', label: '分类' },
  user: { prefix: 'User:', label: '用户' },
  user_talk: { prefix: 'User talk:', label: '用户留言' },
  talk: { prefix: '讨论:', label: '讨论' },
  special: { prefix: 'Special:', label: '特殊页面' },
  'backrooms-zh': { prefix: 'backrooms-zh:', label: '后室中文' }
}

// 前缀匹配规则：大小写不敏感；英文前缀在前，中文别名在后。
// 注意顺序：user_talk（User talk:）必须先于 user（User:）匹配。
const PREFIX_PATTERNS: Array<{ namespace: string; pattern: RegExp }> = [
  { namespace: 'backrooms-zh', pattern: /^backrooms-zh\s*:/i },
  { namespace: 'user_talk', pattern: /^User\s+talk\s*:/i },
  { namespace: 'template', pattern: /^Template\s*:/i },
  { namespace: 'help', pattern: /^Help\s*:/i },
  { namespace: 'category', pattern: /^Category\s*:/i },
  { namespace: 'user', pattern: /^User\s*:/i },
  { namespace: 'special', pattern: /^Special\s*:/i },
  // 中文别名
  { namespace: 'template', pattern: /^模板\s*:/ },
  { namespace: 'help', pattern: /^帮助\s*:/ },
  { namespace: 'category', pattern: /^分类\s*:/ },
  { namespace: 'user', pattern: /^用户\s*:/ },
  { namespace: 'talk', pattern: /^讨论\s*:/ },
  { namespace: 'special', pattern: /^特殊\s*:/ }
]

export interface ParsedTitle {
  /** 命名空间 key，无前缀时为 'main' */
  namespace: string
  /** 去掉前缀后的纯 slug */
  slug: string
  /** 原始显示标题（保留原始大小写与中文别名） */
  displayTitle: string
}

/**
 * 解析页面标题，识别命名空间前缀（大小写不敏感，保留原始大小写做 displayTitle）。
 * 例：parseTitle('Template:Infobox') → { namespace:'template', slug:'Infobox', displayTitle:'Template:Infobox' }
 *     parseTitle('模板:信息框')      → { namespace:'template', slug:'信息框', displayTitle:'模板:信息框' }
 *     parseTitle('普通条目')         → { namespace:'main', slug:'普通条目', displayTitle:'普通条目' }
 */
export function parseTitle(raw: string): ParsedTitle {
  const trimmed = (raw || '').trim()

  // 先匹配已知的特殊命名空间（user_talk 等需要特殊处理的）
  for (const { namespace, pattern } of PREFIX_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) {
      const slug = trimmed.slice(match[0].length).trim()
      return { namespace, slug, displayTitle: trimmed }
    }
  }

  // 通用规则：只要有冒号，前面的就当命名空间
  const colonIndex = trimmed.indexOf(':')
  if (colonIndex > 0) {
    const ns = trimmed.substring(0, colonIndex).trim().toLowerCase()
    const slug = trimmed.substring(colonIndex + 1).trim()
    if (ns && slug) {
      return { namespace: ns, slug, displayTitle: trimmed }
    }
  }

  return { namespace: 'main', slug: trimmed, displayTitle: trimmed }
}

export interface PageRef {
  namespace: string
  slug: string
}

/**
 * 根据命名空间返回前端路由路径。
 * main → /wiki/:slug；template → /wiki/Template:slug；help → /wiki/Help:slug；
 * user → /user/:slug；user_talk → /user/:slug/talk；category → /category/:slug；
 * talk → /wiki/:slug/discussion；special → /special/:slug
 */
export function buildPagePath(ref: PageRef): string {
  const namespace = ref.namespace || 'main'
  const slug = encodeURIComponent(ref.slug || '')

  // 特殊命名空间走专门的路由
  switch (namespace) {
    case 'category':
      return `/category/${slug}`
    case 'user':
      return `/user/${slug}`
    case 'user_talk':
      return `/user/${slug}/talk`
    case 'talk':
      return `/wiki/${slug}/discussion`
    case 'special':
      return `/special/${slug}`
    case 'main':
      return `/wiki/${slug}`
  }

  // 通用命名空间：都走 /wiki/命名空间:slug 格式
  const nsPrefix = NAMESPACES[namespace]?.prefix || `${namespace}:`
  return `/wiki/${encodeURIComponent(nsPrefix)}${slug}`
}

/**
 * 去掉标题前缀得到纯 slug（parseTitle 的语义别名）。
 * 例：stripPrefix('Help:编辑指南') → '编辑指南'
 */
export function stripPrefix(displayTitle: string): string {
  return parseTitle(displayTitle).slug
}
