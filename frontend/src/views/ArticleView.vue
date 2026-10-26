<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import wtf from 'wtf_wikipedia'
// @ts-ignore Wikidot 专用解析渲染库
import { parse as parseWikidot } from '@wdprlib/parser'
// @ts-ignore Wikidot 渲染器
import { renderWikitext, createSettings, WikitextMode } from '@wdprlib/render'
import { useRoute, useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import LocalNav, { type NavSection } from '@/components/LocalNav.vue'
import SideTools, { type PageStat, type RelatedPage } from '@/components/SideTools.vue'
import Infobox, { type InfoboxField } from '@/components/Infobox.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { parseApi, type Syntax } from '@/api/parse'
import { useUserStore } from '@/stores/user'
import type { TocItem } from '@/components/Toc.vue'

// 前端轻量渲染 mediawiki，保留原始 HTML 和样式
function renderMediawiki(content: string): string {
  let html = content

  // 标题
  html = html.replace(/^======\s*(.+?)\s*======\s*$/gm, '<h6>$1</h6>')
  html = html.replace(/^=====\s*(.+?)\s*=====\s*$/gm, '<h5>$1</h5>')
  html = html.replace(/^====\s*(.+?)\s*====\s*$/gm, '<h4>$1</h4>')
  html = html.replace(/^===\s*(.+?)\s*===\s*$/gm, '<h3>$1</h3>')
  html = html.replace(/^==\s*(.+?)\s*==\s*$/gm, '<h2>$1</h2>')
  html = html.replace(/^=\s*(.+?)\s*=\s*$/gm, '<h1>$1</h1>')

  // 粗体斜体
  html = html.replace(/'''([^']+)'''/g, '<strong>$1</strong>')
  html = html.replace(/''([^']+)''/g, '<em>$1</em>')

  // 列表
  html = html.replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  html = html.replace(/^#\s+(.+)$/gm, '<li>$1</li>')

  // 链接 [[页面]] 和 [[页面|显示文本]]
  html = html.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '<a href="/wiki/$1">$2</a>')
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<a href="/wiki/$1">$1</a>')

  // 文件 [[File:xxx.png]] - 用代理显示图片
  html = html.replace(/\[\[File:([^\]|]+)(\|[^\]]*)?\]\]/g, `<img src="/api/proxy/image?file=$1" style="max-width: 100%;" />`)

  // 分类
  html = html.replace(/\[\[分类:([^\]]+)\]\]/g, '<div class="category-link">分类: $1</div>')

  // User: 链接 [[User:xxx]]
  html = html.replace(/\[\[User:([^\]|]+)(\|([^\]]+))?\]\]/g, '<a href="/user/$1">$3</a>')

  // 段落
  html = html.replace(/\n\n+/g, '</p><p>')
  html = '<p>' + html + '</p>'
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

// 前端渲染 wikidot
function renderWikidot(content: string): string {
  let html = content

  // 标题 + 标题
  html = html.replace(/^\+{6}\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^\+{5}\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^\+{4}\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^\+{3}\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^\+{2}\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^\+{1}\s+(.+)$/gm, '<h1>$1</h1>')

  // 粗体 **粗体**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 斜体 //斜体//
  html = html.replace(/\/\/([^\/]+)\/\//g, '<em>$1</em>')
  // 删除线 --删除--
  html = html.replace(/--([^-]+)--/g, '<del>$1</del>')

  // 链接 [[[页面]]]
  html = html.replace(/\[\[\[([^\]|]+)\|([^\]]+)\]\]\]/g, '<a href="/wiki/$1">$2</a>')
  html = html.replace(/\[\[\[([^\]]+)\]\]\]/g, '<a href="/wiki/$1">$1</a>')

  // 列表
  html = html.replace(/^\-\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // 段落
  html = html.replace(/\n\n+/g, '</p><p>')
  html = '<p>' + html + '</p>'

  return html
}

// 自动加载并替换模板
async function expandTemplates(content: string, depth = 0): Promise<string> {
  if (depth > 3) return content // 最多递归 3 层
  
  // 匹配 {{模板名|参数}} 或 {{模板名}}
  const templateRegex = /\{\{([^{}|]+)(\|([^{}]*))?\}\}/g
  const matches = [...content.matchAll(templateRegex)]
  
  for (const match of matches) {
    const fullMatch = match[0]
    const templateName = match[1].trim()
    const paramStr = match[3] || ''
    
    // 跳过魔法字（已经处理过 DISPLAYTITLE 了）
    if (/^(DISPLAYTITLE|DISPLAYTITLE:|PAGENAME|BASEPAGENAME|SUBPAGENAME)/i.test(templateName)) continue
    
    // 解析参数
    const params: Record<string, string> = {}
    if (paramStr) {
      const parts = paramStr.split('|')
      parts.forEach((part, i) => {
        const kv = part.split('=')
        if (kv.length >= 2) {
          params[kv[0].trim()] = kv.slice(1).join('=').trim()
        } else {
          params[String(i + 1)] = part.trim()
        }
      })
    }
    
    try {
      // 加载模板页面
      const res = await fetch(`/api/pages/backrooms-zh/Template:${encodeURIComponent(templateName)}`)
      if (!res.ok) continue
      const tpl = await res.json()
      
      let tplContent = tpl.content
      // 替换参数
      Object.entries(params).forEach(([key, value]) => {
        tplContent = tplContent.replace(new RegExp(`\\{\\{\\{${key}\\}\\}\\}`, 'g'), value)
      })
      // 替换未指定的参数为空
      tplContent = tplContent.replace(/\{\{\{[^}]+\}\}\}/g, '')
      
      // 递归展开模板里的模板
      tplContent = await expandTemplates(tplContent, depth + 1)
      
      // 替换到原内容里
      content = content.replace(fullMatch, tplContent)
    } catch {
      // 加载失败就保留原样
    }
  }
  
  return content
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const loadError = ref('')
const notFound = ref(false)
const page = ref<Page | null>(null)

const renderedHtml = ref('')
const displayTitle = ref('')
const tocItems = ref<TocItem[]>([])
const categories = ref<{ id: number; name: string }[]>([])
const pageStats = ref<PageStat[]>([])
const relatedPages = ref<RelatedPage[]>([])

const contentRef = ref<HTMLElement | null>(null)

const navSections = computed<NavSection[]>(() => [
  {
    heading: '浏览',
    links: [
      { label: '首页', to: '/', icon: 'home' },
      { label: '分类', to: '/category/Levels', icon: 'folder' },
      { label: '随机页面', to: '/wiki/Main_Page', icon: 'shuffle' },
      { label: '最近更改', to: '/special/recentchanges', icon: 'clock' }
    ]
  },
  {
    heading: '工具',
    links: [
      { label: '编辑页面', to: '/wiki/' + route.params.slug + '/edit', icon: 'pencil' },
      { label: '页面历史', to: '/wiki/' + route.params.slug + '/history', icon: 'history' },
      { label: '讨论', to: '/wiki/' + route.params.slug + '/discussion', icon: 'comment' }
    ]
  }
])

const activeLink = computed(() => '/wiki/' + route.params.slug)

const canDelete = computed(() => {
  if (!page.value || !userStore.user) return false
  return userStore.isAdmin || page.value.creator_id === userStore.user.id
})

// 页面是否受保护（兼容后端 snake_case 与前端 camelCase 字段）
const isProtectedPage = computed(() => {
  const raw = page.value as Record<string, unknown> | null
  return Boolean(raw?.is_protected ?? raw?.is_protected)
})

// 保护/取消保护请求进行中
const protecting = ref(false)

// 管理员切换页面保护状态
async function toggleProtect() {
  if (!page.value || protecting.value) return
  const next = !isProtectedPage.value
  if (next && !window.confirm('确定要保护此页面吗？保护后仅管理员可编辑。')) return
  protecting.value = true
  try {
    await pagesApi.protect(page.value.id, next, 'all')
    // 同步本地状态（两种字段都写，兼容既有渲染逻辑）
    const raw = page.value as Record<string, unknown>
    raw.is_protected = next
    raw.is_protected = next ? 1 : 0
    raw.protection_level = next ? 'all' : null
    raw.protection_level = next ? 'all' : null
    // 刷新侧栏"页面信息"中的受保护状态
    const idx = pageStats.value.findIndex((s) => s.label === '受保护')
    if (idx >= 0) pageStats.value[idx] = { label: '受保护', value: next ? '是' : '否' }
  } catch (e: unknown) {
    const err = e as { message?: string }
    window.alert(err.message || '操作失败，请稍后重试。')
  } finally {
    protecting.value = false
  }
}

const infoboxFields = computed<InfoboxField[]>(() => {
  if (!page.value) return []
  const fields: InfoboxField[] = [
    { label: '语法', value: page.value.syntax },
    { label: '创建于', value: new Date(page.value.created_at).toLocaleDateString() },
    { label: '更新于', value: new Date(page.value.updated_at).toLocaleString() }
  ]
  if (categories.value.length) {
    fields.push({
      label: '分类',
      value: categories.value.map((c) => c.name).join(', ')
    })
  }
  return fields
})

function buildToc() {
  const root = contentRef.value
  if (!root) return
  const headings = root.querySelectorAll('h2, h3, h4')
  const items: TocItem[] = []
  headings.forEach((h, i) => {
    let id = h.id
    if (!id) {
      id = 'heading-' + i
      h.id = id
    }
    items.push({
      id,
      text: (h.textContent || '').trim(),
      level: Number(h.tagName.charAt(1))
    })
  })
  tocItems.value = items
}

async function loadPage() {
  loading.value = true
  loadError.value = ''
  notFound.value = false
  page.value = null
  renderedHtml.value = ''
  tocItems.value = []
  categories.value = []

  const rawSlug = String(route.params.slug)
  // 解析命名空间前缀（比如 "Help:Contents" → namespace=help, slug=Contents）
  const { parseTitle } = await import('@/utils/namespace')
  const { namespace, slug } = parseTitle(rawSlug)
  try {
    const p = await pagesApi.get(slug, namespace)
    page.value = p

    // 渲染正文 - 全部前端处理，不调后端
    try {
      const syntax = (p.syntax || 'markdown') as Syntax
      let content = p.content

      if (syntax === 'mediawiki') {
        // 先提取 {{DISPLAYTITLE:xxx}} 魔法字
        const displayTitleMatch = content.match(/\{\{DISPLAYTITLE:([^}]+)\}\}/i)
        if (displayTitleMatch) {
          displayTitle.value = displayTitleMatch[1]
          // 从内容里去掉 DISPLAYTITLE 标签
          content = content.replace(/\{\{DISPLAYTITLE:[^}]+\}\}/gi, '')
        }
        // 自动加载并展开模板
        content = await expandTemplates(content)
        // 直接保留原始 HTML 和内联样式，浏览器自动渲染
        let html = content
        // 图片自动走代理
        html = html.replace(/src="(https?:\/\/static\.wikia\.nocookie\.net[^"]+)"/g, (match: string, url: string) => {
          return `src="/api/proxy/image?url=${encodeURIComponent(url)}"`
        })
        renderedHtml.value = html
      } else if (syntax === 'wikidot') {
        // 用专门的 Wikidot 解析库渲染
        try {
          // @ts-ignore
          const ast = parseWikidot(content)
          // @ts-ignore
          const settings = createSettings('PAGE')
          // @ts-ignore
          const result = await renderWikitext({ ast, page: { }, settings })
          renderedHtml.value = result.html
        } catch (e) {
          console.error('Wikidot 渲染失败，回退基础解析', e)
          renderedHtml.value = renderWikidot(content)
        }
      } else {
        // markdown 用 marked 渲染
        renderedHtml.value = marked.parse(content) as string
      }
    } catch {
      renderedHtml.value = '<p>（内容渲染失败）</p>'
    }

    await nextTick()
    buildToc()

    // 分类
    try {
      categories.value = await pagesApi.categories(p.id)
    } catch {
      categories.value = []
    }

    // 页面统计
    pageStats.value = [
      { label: '最后更新', value: new Date(p.updated_at).toLocaleString() },
      { label: '创建时间', value: new Date(p.created_at).toLocaleDateString() },
      { label: '语法', value: p.syntax },
      { label: '受保护', value: p.is_protected ? '是' : '否' }
    ]

    relatedPages.value = categories.value.slice(0, 5).map((c) => ({
      title: c.name,
      to: '/category/' + encodeURIComponent(c.name)
    }))
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err.status === 404) {
      notFound.value = true
    } else {
      loadError.value = err.message || '加载页面失败，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  if (!page.value) return
  if (!window.confirm(`确定要删除页面「${page.value.title}」吗？此操作可在回收站恢复。`)) {
    return
  }
  try {
    await pagesApi.remove(page.value.id)
    router.push('/')
  } catch (e: unknown) {
    const err = e as { message?: string }
    window.alert(err.message || '删除失败，请稍后重试。')
  }
}

function onSearch(query: string) {
  router.push({ path: '/wiki/' + encodeURIComponent(query) })
}

watch(
  () => route.params.slug,
  () => {
    loadPage()
  }
)

onMounted(() => {
  loadPage()
})
</script>

<template>
  <div class="article-page">
    <GlobalNav @search="onSearch" />
    <WikiHeader title="Wikidom" tagline="在这里，规则是用来打破的" />

    <!-- 加载中 -->
    <div v-if="loading" class="loading" style="padding-top:120px;">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>

    <!-- 加载错误 -->
    <div v-else-if="loadError" class="alert alert--error" style="max-width:600px;margin:100px auto;">
      <span>!</span>
      <span>{{ loadError }}</span>
    </div>

    <!-- 页面不存在 -->
    <div v-else-if="notFound" class="main-container" style="display:block; max-width:800px; margin:80px auto; padding:0 24px;">
      <div class="page-content" style="border:1px solid var(--border-color);">
        <h1 style="font-size:24px;margin-bottom:12px;">页面不存在</h1>
        <p style="color:var(--canvas-text-secondary-background-color);margin-bottom:20px;">
          「{{ route.params.slug }}」还没有被创建。你可以成为第一个编写它的人。
        </p>
        <RouterLink class="btn btn--primary" :to="'/wiki/' + route.params.slug + '/edit'">
          + 创建这个页面
        </RouterLink>
        <RouterLink class="btn" style="margin-left:10px;" to="/">返回首页</RouterLink>
      </div>
    </div>

    <!-- 正常文章 -->
    <template v-else-if="page">
      <PageTabs :slug="String(route.params.slug)" active-tab="article" />

      <div class="main-container">
        <LocalNav :sections="navSections" :active-link="activeLink" />

        <main class="page-content">
          <!-- 分类标签（标题上方） -->
          <div v-if="categories.length" class="page-header__categories">
            in:
            <RouterLink
              v-for="cat in categories"
              :key="cat.id"
              :to="'/category/' + encodeURIComponent(cat.name)"
            >{{ cat.name }}</RouterLink>
          </div>

          <div class="page-header__title-row">
            <h1 class="page-header__title">
              {{ displayTitle || page.title }}
              <span v-if="isProtectedPage" class="protected-badge">已保护</span>
            </h1>
            <div class="page-header__actions">
              <RouterLink :to="'/wiki/' + page.slug + '/history'">历史</RouterLink>
              <RouterLink :to="'/wiki/' + page.slug + '/discussion'">讨论</RouterLink>
              <button
                v-if="userStore.isAdmin"
                class="btn btn--sm"
                type="button"
                :disabled="protecting"
                @click="toggleProtect"
              >{{ isProtectedPage ? '取消保护' : '保护页面' }}</button>
              <button
                v-if="canDelete"
                class="btn btn--sm btn--danger"
                type="button"
                @click="handleDelete"
              >删除</button>
            </div>
          </div>

          <!-- Infobox（有分类信息时显示） -->
          <Infobox
            v-if="categories.length"
            :title="page.title"
            :fields="infoboxFields"
          />

          <!-- 渲染正文 -->
          <div ref="contentRef" class="mw-parser-output" v-html="renderedHtml"></div>

          <!-- 底部分类 -->
          <div v-if="categories.length" class="page-footer__categories">
            <span class="page-footer__categories-label">分类:</span>
            <RouterLink
              v-for="cat in categories"
              :key="cat.id"
              class="page-footer__category"
              :to="'/category/' + encodeURIComponent(cat.name)"
            >{{ cat.name }}</RouterLink>
          </div>
        </main>

        <SideTools :toc-items="tocItems" :page-stats="pageStats" :related-pages="relatedPages" />
      </div>

      <Footer />
    </template>
  </div>
</template>

<style scoped>
/* 模板占位框 */
.template-placeholder {
  display: inline-block;
  padding: 4px 12px;
  margin: 4px 0;
  font-size: 13px;
  color: #6c757d;
  background: #f1f3f5;
  border: 1px dashed #dee2e6;
  border-radius: 4px;
}

/* 图片占位框 */
.image-placeholder {
  display: block;
  padding: 20px;
  margin: 10px 0;
  text-align: center;
  font-size: 13px;
  color: #6c757d;
  background: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 4px;
}

/* 页面已保护标签 */
.protected-badge {
  display: inline-block;
  vertical-align: middle;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  color: #ffffff;
  background: #b8860b;
  border: 1px solid #8a6508;
}
</style>
