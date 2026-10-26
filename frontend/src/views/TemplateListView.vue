<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { buildPagePath, stripPrefix } from '@/utils/namespace'

const router = useRouter()

// 模板调用语法字面量，避免在模板插值里嵌套 {{ }} 导致分词错误
const templateSyntax = '{{模板名}}'

const loading = ref(true)
const error = ref('')
const pages = ref<Page[]>([])

const newName = ref('')

function wikiPath(p: Page): string {
  try {
    return buildPagePath({ namespace: p.namespace || 'template', slug: p.slug })
  } catch {
    return '/wiki/Template:' + encodeURIComponent(p.slug)
  }
}

function displayName(p: Page): string {
  try {
    const s = stripPrefix(p.title)
    return s || p.slug.replace(/_/g, ' ')
  } catch {
    return p.slug.replace(/_/g, ' ')
  }
}

function excerpt(p: Page): string {
  const raw = (p.content || '').replace(/\s+/g, ' ').trim()
  if (!raw) return '（暂无说明）'
  return raw.length > 80 ? raw.slice(0, 80) + '...' : raw
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await pagesApi.list({ namespace: 'template', limit: 100 })
    pages.value = (res.pages || []).slice().sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || '加载模板列表失败。'
  } finally {
    loading.value = false
  }
}

function createTemplate() {
  const name = newName.value.trim()
  if (!name) return
  router.push('/wiki/Template:' + encodeURIComponent(name.replace(/\s+/g, '_')) + '/edit')
}

onMounted(load)
</script>

<template>
  <div class="tpl-page">
    <GlobalNav />
    <WikiHeader title="Wikidom" tagline="在这里，规则是用来打破的" />

    <div class="tpl-container">
      <div class="tpl-head">
        <div>
          <h1 class="tpl-title">模板列表</h1>
          <p class="tpl-sub">复用的页面组件，通过 <code>{{ templateSyntax }}</code> 在任意页面中调用。</p>
        </div>
        <div class="tpl-create">
          <input v-model="newName" type="text" class="form-input" placeholder="输入新模板名..." @keyup.enter="createTemplate" />
          <button class="btn btn--primary" type="button" :disabled="!newName.trim()" @click="createTemplate">新建模板</button>
        </div>
      </div>

      <div v-if="loading" class="loading"><div class="spinner"></div><span>加载中...</span></div>
      <div v-else-if="error" class="alert alert--error"><span>{{ error }}</span></div>

      <template v-else>
        <div v-if="pages.length" class="tpl-grid">
          <RouterLink v-for="p in pages" :key="p.id" class="tpl-card" :to="wikiPath(p)">
            <div class="tpl-card__name">{{ displayName(p) }}</div>
            <div class="tpl-card__excerpt">{{ excerpt(p) }}</div>
            <div class="tpl-card__time">更新于 {{ fmtDate(p.updated_at) }}</div>
          </RouterLink>
        </div>
        <div v-else class="empty-state">还没有模板，创建第一个模板吧。</div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.tpl-page { background: var(--desktop-background-color); min-height: 100vh; }
.tpl-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 48px;
}
.tpl-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.tpl-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
}
.tpl-sub { font-size: 13px; color: var(--canvas-text-secondary-background-color); margin-top: 6px; }
.tpl-sub code {
  background: var(--canvas-secondary-background-color);
  padding: 1px 6px;
  border: 1px solid var(--border-color-light);
}
.tpl-create { display: flex; gap: 8px; }
.tpl-create .form-input { min-width: 180px; }

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.tpl-card {
  display: block;
  padding: 14px;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
}
.tpl-card:hover { border-color: var(--hyperlink-background-color); background: var(--highlight-background-color); }
.tpl-card__name {
  font-size: 15px;
  font-weight: 700;
  color: var(--hyperlink-background-color);
  margin-bottom: 6px;
}
.tpl-card__excerpt {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  line-height: 1.5;
  margin-bottom: 10px;
  min-height: 36px;
}
.tpl-card__time { font-size: 11px; color: var(--canvas-text-secondary-background-color); }

@media (max-width: 1024px) {
  .tpl-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .tpl-container { padding: 16px; }
  .tpl-grid { grid-template-columns: 1fr; }
  .tpl-create { width: 100%; }
  .tpl-create .form-input { flex: 1; }
}
</style>
