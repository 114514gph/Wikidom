<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import LocalNav, { type NavSection } from '@/components/LocalNav.vue'
import SideTools, { type PageStat, type RelatedPage } from '@/components/SideTools.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { categoriesApi, type Category } from '@/api/categories'
import { recentApi, type RecentChange } from '@/api/recent'
import { buildPagePath } from '@/utils/namespace'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const error = ref('')

const latestPages = ref<Page[]>([])
const totalPages = ref(0)
const categories = ref<Category[]>([])
// 最近更改记录
const recentChanges = ref<RecentChange[]>([])

// 搜索状态
const searching = ref(false)
const searchKeyword = ref('')
const searchResults = ref<Page[]>([])
const searchLoading = ref(false)

// 左侧导航
const navSections = reactive<NavSection[]>([
  {
    heading: '命名空间',
    links: [
      { label: '条目', to: '/special/allpages?namespace=main', icon: 'file-text' },
      { label: '模板', to: '/templates', icon: 'template' },
      { label: '分类', to: '/special/allcategories', icon: 'folder' },
      { label: '帮助', to: '/help-center', icon: 'help' }
    ]
  },
  {
    heading: '浏览',
    links: [
      { label: '首页', to: '/', icon: 'home' },
      { label: '所有页面', to: '/special/allpages', icon: 'list' },
      { label: '随机页面', to: '/special/random', icon: 'shuffle' },
      { label: '最近更改', to: '/special/recentchanges', icon: 'clock' }
    ]
  },
  {
    heading: '工具',
    links: [
      { label: '创建新页面', to: '/wiki/New_Page/edit', icon: 'plus' },
      { label: '回收站', to: '/trash', icon: 'trash' }
    ]
  }
])

// 右侧统计
const pageStats = ref<PageStat[]>([])
const relatedPages = ref<RelatedPage[]>([])

function formatTime(iso: string): string {
  if (!iso) return '—'
  // 兼容 "2026-10-24 01:22:45" 和 ISO 两种格式
  const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T')
  const t = new Date(normalized).getTime()
  if (isNaN(t)) return '—'
  const diff = (Date.now() - t) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
  return Math.floor(diff / 86400) + ' 天前'
}

async function loadHome() {
  loading.value = true
  error.value = ''
  try {
    const [pageRes, catRes] = await Promise.all([
      pagesApi.list({ sort: 'updated', limit: 10 }),
      categoriesApi.list(1, 12)
    ])
    latestPages.value = pageRes.pages
    totalPages.value = pageRes.total
    categories.value = catRes.categories

    pageStats.value = [
      { label: '文章总数', value: String(pageRes.total) },
      { label: '分类数', value: String(catRes.total) },
      { label: '最近更新', value: pageRes.pages[0] ? formatTime(pageRes.pages[0].updated_at) : '—' }
    ]

    relatedPages.value = pageRes.pages.slice(0, 5).map((p) => ({
      title: p.title,
      to: buildPagePath({ namespace: p.namespace, slug: p.slug })
    }))
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || '加载首页数据失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

// 加载最近更改（失败不影响首页其他内容）
async function loadRecent() {
  try {
    const res = await recentApi.list(10)
    recentChanges.value = res.changes
  } catch {
    recentChanges.value = []
  }
}

async function handleSearch(query: string) {
  searchKeyword.value = query
  searching.value = true
  searchLoading.value = true
  searchResults.value = []
  error.value = ''
  try {
    const res = await pagesApi.list({ search: query, limit: 20 })
    searchResults.value = res.pages
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || '搜索失败，请稍后重试。'
  } finally {
    searchLoading.value = false
  }
}

function clearSearch() {
  searching.value = false
  searchKeyword.value = ''
  searchResults.value = []
}

function goCreate() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
  } else {
    router.push('/wiki/' + 'New_Page' + '/edit')
  }
}

function openCategory(name: string) {
  router.push('/category/' + encodeURIComponent(name))
}

onMounted(() => {
  loadHome()
  loadRecent()
})
</script>

<template>
  <div class="home-page">
    <GlobalNav @search="handleSearch" />
    <WikiHeader title="Wikidom" tagline="在这里，规则是用来打破的" />

    <div class="main-container">
      <LocalNav :sections="navSections" active-link="/" />

      <main class="page-content">
        <!-- 欢迎横幅 -->
        <div class="home-hero">
          <h1 class="home-hero__title">Wikidom</h1>
          <p class="home-hero__tagline">
            规则，是用来打破的。在这里，你就是规则。
          </p>
          <div class="home-hero__actions">
            <button v-if="!userStore.isLoggedIn" class="btn btn--primary" type="button" @click="router.push('/register')">
              开始编辑
            </button>
            <button v-else class="btn btn--primary" type="button" @click="goCreate">
              + 创建新页面
            </button>
            <button v-if="userStore.isLoggedIn" class="btn" type="button" @click="router.push('/wiki/Main_Page')">
              浏览首页
            </button>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="alert alert--error" role="alert">
          <span>!</span>
          <span>{{ error }}</span>
        </div>

        <!-- 加载中 -->
        <div v-if="loading && !searching" class="loading">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>

        <!-- 搜索结果模式 -->
        <template v-else-if="searching">
          <div class="home-section-head">
            <h2 class="home-section__title">搜索：{{ searchKeyword }}</h2>
            <button class="btn btn--sm btn--ghost" type="button" @click="clearSearch">清除搜索</button>
          </div>

          <div v-if="searchLoading" class="loading">
            <div class="spinner"></div>
            <span>搜索中...</span>
          </div>

          <div v-else-if="searchResults.length" class="result-list">
            <div v-for="page in searchResults" :key="page.id" class="result-item">
              <RouterLink class="result-item__title" :to="buildPagePath({ namespace: page.namespace, slug: page.slug })">
                {{ page.title }}
              </RouterLink>
              <div class="result-item__meta">
                更新于 {{ formatTime(page.updated_at) }} · 语法 {{ page.syntax }}
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            未找到与「{{ searchKeyword }}」相关的页面。
            <div style="margin-top:12px;">
              <RouterLink class="btn btn--primary btn--sm" :to="'/wiki/' + encodeURIComponent(searchKeyword) + '/edit'">
                + 创建这个页面
              </RouterLink>
            </div>
          </div>
        </template>

        <!-- 默认首页内容 -->
        <template v-else>
          <!-- 最新文章 -->
          <section>
            <div class="home-section-head">
              <h2 class="home-section__title">最新文章</h2>
              <span class="home-section__desc">社区最近更新的 {{ totalPages }} 篇文章</span>
            </div>

            <div v-if="latestPages.length" class="latest-list">
              <RouterLink
                v-for="page in latestPages"
                :key="page.id"
                class="latest-item"
                :to="buildPagePath({ namespace: page.namespace, slug: page.slug })"
              >
                <div class="latest-item__badge">✎</div>
                <div class="latest-item__body">
                  <div class="latest-item__title">{{ page.title }}</div>
                  <div class="latest-item__meta">
                    {{ formatTime(page.updated_at) }} · 语法 {{ page.syntax }}
                  </div>
                </div>
              </RouterLink>
            </div>
            <div v-else class="empty-state">暂无文章，来创建第一篇吧。</div>
          </section>

          <!-- 最近更改 -->
          <section class="mt-4">
            <div class="home-section-head">
              <h2 class="home-section__title">最近更改</h2>
              <span class="home-section__desc">社区最近的 10 次编辑</span>
            </div>

            <div v-if="recentChanges.length" class="recent-list">
              <div v-for="change in recentChanges" :key="change.page_id + '-' + change.version" class="recent-item">
                <RouterLink class="recent-item__title" :to="buildPagePath({ namespace: change.namespace, slug: change.slug })">
                  {{ change.title }}
                </RouterLink>
                <div class="recent-item__meta">
                  <span>{{ change.editor_name }}</span>
                  <span>·</span>
                  <span>{{ formatTime(change.created_at) }}</span>
                  <span v-if="change.edit_summary">· {{ change.edit_summary }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">暂无更改记录。</div>
          </section>

          <!-- 热门分类 -->
          <section class="mt-4">
            <div class="home-section-head">
              <h2 class="home-section__title">热门分类</h2>
            </div>
            <div v-if="categories.length" class="cat-grid">
              <button
                v-for="cat in categories"
                :key="cat.id"
                class="cat-cell"
                type="button"
                @click="openCategory(cat.name)"
              >
                <div class="cat-cell__name">{{ cat.name }}</div>
                <div class="cat-cell__count">{{ cat.page_count }} 篇</div>
              </button>
            </div>
            <div v-else class="empty-state">暂无分类。</div>
          </section>
        </template>
      </main>

      <SideTools :page-stats="pageStats" :related-pages="relatedPages" />
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.home-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}

.home-hero {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  padding: 32px 24px;
  margin-bottom: 20px;
  text-align: center;
}
.home-hero__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 8px;
}
.home-hero__subtitle {
  font-size: 14px;
  color: var(--canvas-text-secondary-background-color);
  max-width: 640px;
  margin: 0 auto 12px;
  line-height: 1.6;
}
.home-hero__tagline {
  font-size: 16px;
  font-weight: 600;
  color: var(--hyperlink-background-color);
  max-width: 640px;
  margin: 0 auto 20px;
  line-height: 1.5;
}
.home-hero__actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.home-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.home-section__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
}
.home-section__desc {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
}

.latest-list {
  border: 1px solid var(--border-color);
  background: var(--canvas-background-color);
}
.latest-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color-light);
  color: var(--canvas-text-background-color);
}
.latest-item:last-child { border-bottom: none; }
.latest-item:hover {
  background: var(--canvas-secondary-background-color);
  text-decoration: none;
}
.latest-item__badge {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  background: #2e7d32;
  color: #ffffff;
  font-size: 12px;
}
.latest-item__title {
  font-size: 14px;
  color: var(--canvas-text-background-color);
  margin-bottom: 2px;
}
.latest-item:hover .latest-item__title { color: var(--hyperlink-background-color); }
.latest-item__meta {
  font-size: 11px;
  color: var(--canvas-text-secondary-background-color);
}

/* 最近更改列表 */
.recent-list {
  border: 1px solid var(--border-color);
  background: var(--canvas-background-color);
}
.recent-item {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color-light);
}
.recent-item:last-child { border-bottom: none; }
.recent-item__title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  margin-bottom: 2px;
}
.recent-item__title:hover {
  color: var(--hyperlink-background-color);
}
.recent-item__meta {
  font-size: 11px;
  color: var(--canvas-text-secondary-background-color);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.result-list {
  border: 1px solid var(--border-color);
  background: var(--canvas-background-color);
}.result-item {
  display: block;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color-light);
}
.result-item:last-child { border-bottom: none; }
.result-item:hover { background: var(--canvas-secondary-background-color); }
.result-item__title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  margin-bottom: 2px;
}
.result-item:hover .result-item__title { color: var(--hyperlink-background-color); }
.result-item__meta {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: var(--border-color-light);
  border: 1px solid var(--border-color);
}
.cat-cell {
  background: var(--canvas-background-color);
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  border: none;
}
.cat-cell:hover {
  background: var(--highlight-background-color);
}
.cat-cell__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
}
.cat-cell:hover .cat-cell__name { color: var(--hyperlink-background-color); }
.cat-cell__count {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  margin-top: 4px;
}

@media (max-width: 768px) {
  .cat-grid { grid-template-columns: repeat(2, 1fr); }
  .home-hero__title { font-size: 22px; }
}
</style>
