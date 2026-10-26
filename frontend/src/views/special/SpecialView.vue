<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import Footer from '@/components/Footer.vue'
import { recentApi, type RecentChange } from '@/api/recent'
import { searchApi, type SearchResult } from '@/api/search'
import { specialApi } from '@/api/special'
import { buildPagePath } from '@/utils/namespace'

const route = useRoute()
const router = useRouter()

// 路由 /special/:page，兼容 “Special:RecentChanges” 与 “RecentChanges” 两种写法
// 同时兼容大小写：recentchanges / RecentChanges / RECENTCHANGES 都能识别
const rawPage = computed(() => String(route.params.page || ''))
const norm = computed(() => {
  let p = rawPage.value.replace(/^special:/i, '')
  p = p.toLowerCase()
  // 常见特殊页面名映射
  const aliasMap: Record<string, string> = {
    recentchanges: 'RecentChanges',
    allpages: 'AllPages',
    random: 'RandomPage',
    randompage: 'RandomPage',
    listusers: 'ListUsers',
    users: 'ListUsers',
    search: 'Search'
  }
  return aliasMap[p] || p.charAt(0).toUpperCase() + p.slice(1)
})

const PAGE_TITLES: Record<string, string> = {
  RecentChanges: '最近更改',
  AllPages: '所有页面',
  RandomPage: '随机页面',
  ListUsers: '用户列表',
  Search: '搜索'
}

const pageTitle = computed(() => PAGE_TITLES[norm.value] || '特殊页面')

const knownSpecials = Object.keys(PAGE_TITLES).map((key) => ({
  key,
  label: PAGE_TITLES[key]
}))

// 把 {namespace, slug} 安全地转成 wiki 路径（namespace.ts 提供）
function wikiPath(ns: string, slug: string): string {
  try {
    return buildPagePath({ namespace: ns || 'main', slug })
  } catch {
    return '/wiki/' + (ns && ns !== 'main' ? ns + ':' : '') + encodeURIComponent(slug)
  }
}

function fmtTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : iso + 'Z')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── RecentChanges ───────────────────────────────────────────
const rcLoading = ref(false)
const rcError = ref('')
const changes = ref<RecentChange[]>([])

async function loadRecent() {
  rcLoading.value = true
  rcError.value = ''
  try {
    const res = await recentApi.list(50)
    changes.value = res.changes || []
  } catch (e: unknown) {
    const err = e as { message?: string }
    rcError.value = err.message || '加载最近更改失败。'
  } finally {
    rcLoading.value = false
  }
}

// ─── AllPages ───────────────────────────────────────────────
const AP_LIMIT = 50
const apLoading = ref(false)
const apError = ref('')
const apPages = ref<{ id: number; title: string; namespace: string; slug: string; updatedAt?: string; updated_at?: string }[]>([])
const apTotal = ref(0)
const apOffset = ref(0)
const apNs = ref('')
const apPrefix = ref('')

const NS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'main', label: '主' },
  { value: 'template', label: '模板' },
  { value: 'help', label: '帮助' },
  { value: 'category', label: '分类' },
  { value: 'user', label: '用户' }
]

const apHasPrev = computed(() => apOffset.value > 0)
const apHasNext = computed(() => apOffset.value + AP_LIMIT < apTotal.value)

async function loadAll() {
  apLoading.value = true
  apError.value = ''
  try {
    const res = await specialApi.allPages({
      namespace: apNs.value || undefined,
      prefix: apPrefix.value || undefined,
      limit: AP_LIMIT,
      offset: apOffset.value
    })
    apPages.value = res.pages || []
    apTotal.value = res.total || 0
  } catch (e: unknown) {
    const err = e as { message?: string }
    apError.value = err.message || '加载页面列表失败。'
  } finally {
    apLoading.value = false
  }
}

function resetAndLoadAll() {
  apOffset.value = 0
  loadAll()
}

function apPrev() {
  if (!apHasPrev.value) return
  apOffset.value = Math.max(0, apOffset.value - AP_LIMIT)
  loadAll()
}
function apNext() {
  if (!apHasNext.value) return
  apOffset.value += AP_LIMIT
  loadAll()
}

// ─── RandomPage ─────────────────────────────────────────────
const randBusy = ref(false)
async function doRandom() {
  if (randBusy.value) return
  randBusy.value = true
  try {
    const r = await specialApi.random()
    router.push(wikiPath(r.namespace || 'main', r.slug))
  } catch (e: unknown) {
    const err = e as { message?: string }
    window.alert(err.message || '无法获取随机页面。')
  } finally {
    randBusy.value = false
  }
}

// ─── ListUsers ───────────────────────────────────────────────
const LU_LIMIT = 25
const luLoading = ref(false)
const luError = ref('')
const luUsers = ref<{ id: number; username: string; displayName?: string; createdAt?: string; created_at?: string; editCount?: number }[]>([])
const luTotal = ref(0)
const luOffset = ref(0)

const luHasPrev = computed(() => luOffset.value > 0)
const luHasNext = computed(() => luOffset.value + LU_LIMIT < luTotal.value)

async function loadUsers() {
  luLoading.value = true
  luError.value = ''
  try {
    const res = await specialApi.listUsers({ limit: LU_LIMIT, offset: luOffset.value })
    luUsers.value = res.users || []
    luTotal.value = res.total || 0
  } catch (e: unknown) {
    const err = e as { message?: string }
    luError.value = err.message || '加载用户列表失败。'
  } finally {
    luLoading.value = false
  }
}
function luPrev() {
  if (!luHasPrev.value) return
  luOffset.value = Math.max(0, luOffset.value - LU_LIMIT)
  loadUsers()
}
function luNext() {
  if (!luHasNext.value) return
  luOffset.value += LU_LIMIT
  loadUsers()
}

// ─── Search ──────────────────────────────────────────────────
const sq = ref('')
const searching = ref(false)
const sResults = ref<SearchResult[]>([])
const sTotal = ref(0)
const hasSearched = ref(false)

async function doSearch() {
  const q = sq.value.trim()
  if (!q) return
  searching.value = true
  try {
    const res = await searchApi.search(q, 20)
    sResults.value = res.results || []
    sTotal.value = res.total || 0
    hasSearched.value = true
  } catch (e: unknown) {
    const err = e as { message?: string }
    window.alert(err.message || '搜索失败，请稍后重试。')
  } finally {
    searching.value = false
  }
}

// 根据当前分发加载对应数据
function loadActive() {
  if (norm.value === 'RecentChanges') loadRecent()
  else if (norm.value === 'AllPages') { apOffset.value = 0; loadAll() }
  else if (norm.value === 'ListUsers') { luOffset.value = 0; loadUsers() }
}

onMounted(loadActive)
watch(norm, loadActive)
</script>

<template>
  <div class="special-page">
    <GlobalNav />
    <WikiHeader title="Wikidom" tagline="在这里，规则是用来打破的" />

    <div class="special-container">
      <h1 class="special-title">{{ pageTitle }}</h1>

      <!-- 未知特殊页面 -->
      <div v-if="!PAGE_TITLES[norm]" class="panel">
        <p class="text-muted">「{{ rawPage }}」不是一个有效的特殊页面。</p>
        <h2 class="panel__title" style="margin-top:16px;">可用的特殊页面</h2>
        <ul class="special-links">
          <li v-for="s in knownSpecials" :key="s.key">
            <RouterLink :to="'/special/' + s.key">{{ s.label }}</RouterLink>
          </li>
        </ul>
      </div>

      <!-- 最近更改 -->
      <div v-else-if="norm === 'RecentChanges'" class="panel">
        <div v-if="rcLoading" class="loading"><div class="spinner"></div><span>加载中...</span></div>
        <div v-else-if="rcError" class="alert alert--error"><span>{{ rcError }}</span></div>
        <div v-else-if="changes.length" class="rc-list">
          <div v-for="c in changes" :key="c.page_id + ':' + c.version" class="rc-item">
            <span class="rc-item__time">{{ fmtTime(c.created_at) }}</span>
            <RouterLink class="rc-item__title" :to="wikiPath(c.namespace, c.slug)">{{ c.title }}</RouterLink>
            <span class="rc-item__user">{{ c.editor_name }}</span>
            <span class="rc-item__summary">{{ c.edit_summary || '（无摘要）' }}</span>
            <span class="rc-item__ver">r{{ c.version }}</span>
          </div>
        </div>
        <div v-else class="empty-state">暂无最近更改记录。</div>
      </div>

      <!-- 所有页面 -->
      <div v-else-if="norm === 'AllPages'" class="panel">
        <div class="ap-filters">
          <label class="ap-filters__label" for="apNs">命名空间</label>
          <select id="apNs" v-model="apNs" class="form-select" @change="resetAndLoadAll">
            <option v-for="o in NS_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <input v-model="apPrefix" type="text" class="form-input ap-filters__input" placeholder="按标题前缀过滤..." @keyup.enter="resetAndLoadAll" />
          <button class="btn btn--primary btn--sm" type="button" @click="resetAndLoadAll">过滤</button>
        </div>

        <div v-if="apLoading" class="loading"><div class="spinner"></div><span>加载中...</span></div>
        <div v-else-if="apError" class="alert alert--error"><span>{{ apError }}</span></div>
        <template v-else>
          <div v-if="apPages.length" class="rc-list">
            <div v-for="p in apPages" :key="p.id" class="rc-item">
              <RouterLink class="rc-item__title" :to="wikiPath(p.namespace, p.slug)">{{ p.title }}</RouterLink>
              <span class="rc-item__time">{{ fmtTime(p.updated_at || p.updated_at) }}</span>
            </div>
          </div>
          <div v-else class="empty-state">该条件下没有页面。</div>

          <div class="pager">
            <span class="pager__info">共 {{ apTotal }} 个页面</span>
            <div class="pager__btns">
              <button class="btn btn--sm" type="button" :disabled="!apHasPrev" @click="apPrev">上一页</button>
              <button class="btn btn--sm" type="button" :disabled="!apHasNext" @click="apNext">下一页</button>
            </div>
          </div>
        </template>
      </div>

      <!-- 随机页面 -->
      <div v-else-if="norm === 'RandomPage'" class="panel">
        <p class="text-muted">点击下方按钮，随机跳转到本 Wiki 的任意一个页面。</p>
        <div style="margin-top:16px;">
          <button class="btn btn--primary" type="button" :disabled="randBusy" @click="doRandom">
            {{ randBusy ? '跳转中...' : '随机带我去一页' }}
          </button>
        </div>
      </div>

      <!-- 用户列表 -->
      <div v-else-if="norm === 'ListUsers'" class="panel">
        <div v-if="luLoading" class="loading"><div class="spinner"></div><span>加载中...</span></div>
        <div v-else-if="luError" class="alert alert--error"><span>{{ luError }}</span></div>
        <template v-else>
          <div v-if="luUsers.length" class="lu-table-wrap">
            <table class="lu-table">
              <thead>
                <tr><th>用户名</th><th>注册时间</th><th>编辑数</th></tr>
              </thead>
              <tbody>
                <tr v-for="u in luUsers" :key="u.id">
                  <td>
                    <RouterLink class="rc-item__title" :to="'/user/' + encodeURIComponent(u.username)">
                      {{ u.displayName || u.username }}
                    </RouterLink>
                  </td>
                  <td class="rc-item__time">{{ fmtTime(u.created_at || u.created_at) }}</td>
                  <td>{{ u.editCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">暂无用户。</div>

          <div class="pager">
            <span class="pager__info">共 {{ luTotal }} 位用户</span>
            <div class="pager__btns">
              <button class="btn btn--sm" type="button" :disabled="!luHasPrev" @click="luPrev">上一页</button>
              <button class="btn btn--sm" type="button" :disabled="!luHasNext" @click="luNext">下一页</button>
            </div>
          </div>
        </template>
      </div>

      <!-- 搜索 -->
      <div v-else-if="norm === 'Search'" class="panel">
        <div class="search-box">
          <input v-model="sq" type="text" class="form-input search-box__input" placeholder="输入关键词搜索全站页面..." @keyup.enter="doSearch" />
          <button class="btn btn--primary" type="button" :disabled="searching" @click="doSearch">
            {{ searching ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <div v-if="hasSearched" style="margin-top:20px;">
          <div v-if="searching" class="loading"><div class="spinner"></div><span>搜索中...</span></div>
          <template v-else>
            <p class="text-muted" style="margin-bottom:12px;">找到 {{ sTotal }} 个结果</p>
            <div v-if="sResults.length" class="search-results">
              <div v-for="r in sResults" :key="r.id" class="search-result">
                <div class="search-result__head">
                  <RouterLink class="search-result__title" :to="wikiPath(r.namespace, r.slug)">
                    <span v-html="r.title"></span>
                  </RouterLink>
                  <span v-if="r.namespace && r.namespace !== 'main'" class="ns-tag">{{ r.namespace }}</span>
                </div>
                <div class="search-result__snippet" v-html="r.snippet"></div>
              </div>
            </div>
            <div v-else class="empty-state">没有找到匹配的页面。</div>
          </template>
        </div>
      </div>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.special-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}
.special-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 48px;
}
.special-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 16px;
}
.panel {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 20px;
}
.panel__title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color-light);
}
.special-links { list-style: disc; padding-left: 20px; display: grid; gap: 6px; }

.rc-list { border: 1px solid var(--border-color); }
.rc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color-light);
  flex-wrap: wrap;
}
.rc-item:last-child { border-bottom: none; }
.rc-item:hover { background: var(--canvas-secondary-background-color); }
.rc-item__time { font-size: 12px; color: var(--canvas-text-secondary-background-color); white-space: nowrap; min-width: 120px; }
.rc-item__title { font-size: 14px; font-weight: 600; color: var(--hyperlink-background-color); }
.rc-item__user { font-size: 12px; color: var(--canvas-text-secondary-background-color); }
.rc-item__summary { font-size: 12px; color: var(--canvas-text-secondary-background-color); flex: 1; min-width: 120px; }
.rc-item__ver { font-size: 11px; color: var(--canvas-text-secondary-background-color); }

.ap-filters { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.ap-filters__label { font-size: 13px; font-weight: 600; color: var(--canvas-text-background-color); }
.ap-filters__input { flex: 1; min-width: 160px; }

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.pager__info { font-size: 12px; color: var(--canvas-text-secondary-background-color); }
.pager__btns { display: flex; gap: 8px; }

.lu-table-wrap { overflow-x: auto; }
.lu-table { width: 100%; border-collapse: collapse; }
.lu-table th, .lu-table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color-light);
  font-size: 13px;
}
.lu-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--canvas-text-secondary-background-color);
}

.search-box { display: flex; gap: 8px; }
.search-box__input { flex: 1; }
.search-results { display: grid; gap: 14px; }
.search-result { padding-bottom: 14px; border-bottom: 1px solid var(--border-color-light); }
.search-result:last-child { border-bottom: none; }
.search-result__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.search-result__title { font-size: 15px; font-weight: 600; color: var(--hyperlink-background-color); }
.search-result__snippet { font-size: 13px; color: var(--canvas-text-secondary-background-color); line-height: 1.5; }
.search-result :deep(mark) { background: #ffe58a; color: inherit; padding: 0 1px; }
.ns-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color);
  color: var(--canvas-text-secondary-background-color);
}

@media (max-width: 640px) {
  .special-container { padding: 16px; }
  .rc-item__time { min-width: 0; }
}
</style>
