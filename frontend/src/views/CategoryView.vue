<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import LocalNav, { type NavSection } from '@/components/LocalNav.vue'
import Footer from '@/components/Footer.vue'
import { categoriesApi, type Category, type CategoryDetail } from '@/api/categories'

// 分类下页面的最小结构（后端返回 unknown[]，此处做防御性映射）
interface CategoryPage {
  id: number
  title: string
  slug: string
  updatedAt?: string
  updated_at?: string
}

const route = useRoute()

const loading = ref(true)
const error = ref('')
const detail = ref<CategoryDetail | null>(null)
const allCategories = ref<Category[]>([])
const navLoading = ref(true)

const name = computed(() => {
  const raw = route.params.name
  const s = Array.isArray(raw) ? raw[0] : raw
  return decodeURIComponent(s || '')
})

const navSections = computed<NavSection[]>(() => {
  const links = allCategories.value.map((c) => ({
    label: c.name,
    to: `/category/${encodeURIComponent(c.name)}`,
    icon: 'folder'
  }))
  return [
    {
      heading: '分类导航',
      links: [{ label: '全部分类', to: '/category/' + encodeURIComponent(allCategories.value[0]?.name || ''), icon: 'folder' }, ...links]
    }
  ]
})

const pageList = computed<CategoryPage[]>(() => {
  const raw = (detail.value?.pages || []) as CategoryPage[]
  return [...raw].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
})

function formatUpdated(p: CategoryPage): string {
  const iso = p.updated_at || p.updated_at
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function loadDetail() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await categoriesApi.get(name.value)
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || '无法加载分类，该分类可能不存在。'
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  navLoading.value = true
  try {
    const res = await categoriesApi.list(1, 200)
    allCategories.value = res.categories || []
  } catch {
    // 侧栏加载失败不阻断主内容
    allCategories.value = []
  } finally {
    navLoading.value = false
  }
}

onMounted(() => {
  loadDetail()
  loadCategories()
})
watch(name, loadDetail)
</script>

<template>
  <div class="category-page">
    <GlobalNav />
    <WikiHeader title="后室 Wiki" tagline="The Backrooms Encyclopedia" />

    <div class="main-container">
      <LocalNav v-if="!navLoading" :sections="navSections" :active-link="`/category/${encodeURIComponent(name)}`" />

      <main class="page-content">
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <span>正在加载分类...</span>
        </div>

        <div v-else-if="error" class="alert alert--error"><span>{{ error }}</span></div>

        <template v-else-if="detail">
          <!-- 面包屑 -->
          <nav class="breadcrumb">
            <RouterLink to="/">主页</RouterLink>
            <span class="breadcrumb__sep">/</span>
            <RouterLink to="/category/Levels">分类</RouterLink>
            <span class="breadcrumb__sep">/</span>
            <span class="breadcrumb__current">{{ detail.category.name }}</span>
          </nav>

          <h1 class="cat-title">分类：{{ detail.category.name }}</h1>
          <p class="cat-stats">
            本分类包含 <strong>{{ pageList.length }} 个页面</strong>，
            <strong>{{ detail.subcategories.length }} 个子分类</strong>。
          </p>

          <!-- 子分类 -->
          <section v-if="detail.subcategories.length">
            <h2 class="section-heading">子分类</h2>
            <div class="subcat-grid">
              <RouterLink
                v-for="sub in detail.subcategories"
                :key="sub.id"
                class="subcat-card"
                :to="`/category/${encodeURIComponent(sub.name)}`"
              >
                <div class="subcat-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" />
                    <path d="M3 9h18" />
                  </svg>
                </div>
                <div class="subcat-card__name">{{ sub.name }}</div>
                <div class="subcat-card__count">{{ sub.page_count }} 个页面</div>
              </RouterLink>
            </div>
          </section>

          <!-- 页面列表 -->
          <section>
            <h2 class="section-heading">"{{ detail.category.name }}" 中的页面</h2>
            <div v-if="pageList.length" class="page-list">
              <div v-for="p in pageList" :key="p.id" class="page-list__item">
                <RouterLink class="page-list__title" :to="`/wiki/${p.slug}`">{{ p.title }}</RouterLink>
                <span v-if="formatUpdated(p)" class="page-list__time">更新于 {{ formatUpdated(p) }}</span>
              </div>
            </div>
            <div v-else class="empty-state">该分类下暂无页面。</div>
          </section>
        </template>
      </main>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.category-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}

.breadcrumb {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 12px;
}
.breadcrumb a { color: var(--canvas-text-secondary-background-color); }
.breadcrumb a:hover { color: var(--hyperlink-background-color); }
.breadcrumb__sep { margin: 0 4px; color: var(--border-color); }
.breadcrumb__current { color: var(--canvas-text-background-color); }

.cat-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 6px;
}
.cat-stats {
  font-size: 13px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 20px;
}
.cat-stats strong { color: var(--canvas-text-background-color); }

.section-heading {
  font-size: 16px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin: 24px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}

.subcat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.subcat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color-light);
}
.subcat-card:hover {
  border-color: var(--hyperlink-background-color);
  background: var(--highlight-background-color);
  text-decoration: none;
}
.subcat-card__icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  color: var(--canvas-text-secondary-background-color);
  flex-shrink: 0;
}
.subcat-card__icon svg { width: 18px; height: 18px; }
.subcat-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
}
.subcat-card__count { font-size: 11px; color: var(--canvas-text-secondary-background-color); }

.page-list {
  border: 1px solid var(--border-color);
}
.page-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color-light);
}
.page-list__item:last-child { border-bottom: none; }
.page-list__item:hover { background: var(--canvas-secondary-background-color); }
.page-list__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--hyperlink-background-color);
}
.page-list__time {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .subcat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .subcat-grid { grid-template-columns: 1fr; }
  .cat-title { font-size: 22px; }
}
</style>
