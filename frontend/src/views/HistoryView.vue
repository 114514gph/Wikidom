<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page, type PageVersion } from '@/api/pages'
import { versionsApi, type VersionDiff, type DiffLine } from '@/api/versions'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

// 解析命名空间
const { parseTitle } = await import('@/utils/namespace')
const rawSlug = String(route.params.slug)
const { namespace, slug: realSlug } = parseTitle(rawSlug)

const loading = ref(true)
const error = ref('')
const page = ref<Page | null>(null)
const versions = ref<PageVersion[]>([])

// 版本对比：勾选两个版本（旧/新）
const selectedVersions = ref<number[]>([])
const diffLoading = ref(false)
const diffError = ref('')
const diffResult = ref<VersionDiff | null>(null)

// 回滚
const restoring = ref<number | null>(null)
const rollbackMsg = ref('')
const rollbackErr = ref('')

const slug = computed(() => String(route.params.slug || ''))

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function contentSize(v: PageVersion): string {
  const len = (v.content || '').length
  if (len < 1024) return `${len} B`
  return `${(len / 1024).toFixed(1)} KB`
}

async function loadData() {
  loading.value = true
  error.value = ''
  diffResult.value = null
  diffError.value = ''
  rollbackMsg.value = ''
  rollbackErr.value = ''
  selectedVersions.value = []
  try {
    page.value = await pagesApi.get(realSlug, namespace)
    const res = await versionsApi.list(page.value.id)
    versions.value = res.versions || []
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || '无法加载版本历史，页面可能不存在。'
  } finally {
    loading.value = false
  }
}

// 勾选/取消勾选版本；最多两个，超出时挤掉最早选中的
function toggleSelect(v: PageVersion) {
  const idx = selectedVersions.value.indexOf(v.version)
  if (idx >= 0) {
    selectedVersions.value.splice(idx, 1)
  } else {
    selectedVersions.value.push(v.version)
    if (selectedVersions.value.length > 2) {
      selectedVersions.value.shift()
    }
  }
  // 选中恰好两个版本时自动对比
  if (selectedVersions.value.length === 2) {
    runDiff()
  } else {
    diffResult.value = null
    diffError.value = ''
  }
}

async function runDiff() {
  if (!page.value || selectedVersions.value.length !== 2) return
  // 版本号小者为旧、大者为新
  const [a, b] = selectedVersions.value
  const oldV = Math.min(a, b)
  const newV = Math.max(a, b)
  diffLoading.value = true
  diffError.value = ''
  try {
    diffResult.value = await versionsApi.diff(page.value.id, oldV, newV)
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    diffError.value = err?.message || err?.error || '对比失败，请稍后重试。'
    diffResult.value = null
  } finally {
    diffLoading.value = false
  }
}

function lineClass(t: DiffLine['type']): string {
  return 'diff-line--' + t
}

async function rollback(v: PageVersion) {
  if (!page.value) return
  if (!confirm(`确定要回滚到版本 r${v.version}（${formatDate(v.created_at)}）吗？这将创建一个新版本。`)) {
    return
  }
  restoring.value = v.version
  rollbackErr.value = ''
  rollbackMsg.value = ''
  try {
    const res = await versionsApi.restore(page.value.id, v.version)
    rollbackMsg.value = res.message || `已回滚到版本 r${v.version}。`
    await loadData()
  } catch (e: unknown) {
    const err = e as { message?: string }
    rollbackErr.value = err?.message || '回滚失败，请稍后重试。'
  } finally {
    restoring.value = null
  }
}

onMounted(loadData)
watch(() => route.params.slug, loadData)
</script>

<template>
  <div class="history-page">
    <GlobalNav />
    <WikiHeader title="后室 Wiki" tagline="The Backrooms Encyclopedia" />
    <PageTabs v-if="rawSlug" :slug="rawSlug" active-tab="history" />

    <div class="history-container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>正在加载版本历史...</span>
      </div>

      <div v-else-if="error" class="alert alert--error"><span>{{ error }}</span></div>

      <template v-else-if="page">
        <h1 class="history-title">{{ page.title }} — 版本历史</h1>
        <p class="history-subtitle">
          共 {{ versions.length }} 个版本。勾选两个版本即可查看差异。
        </p>

        <div v-if="rollbackMsg" class="alert alert--success"><span>{{ rollbackMsg }}</span></div>
        <div v-if="rollbackErr" class="alert alert--error"><span>{{ rollbackErr }}</span></div>

        <div v-if="diffError" class="alert alert--warning"><span>{{ diffError }}</span></div>
        <div v-if="diffLoading" class="alert alert--info"><span>正在计算差异...</span></div>

        <!-- Diff 结果：左旧右新双栏 -->
        <div v-if="diffResult" class="diff-box">
          <div class="diff-box__header">
            差异：r{{ diffResult.oldVersion }} &rarr; r{{ diffResult.newVersion }}
          </div>
          <div class="diff-columns">
            <div class="diff-col">
              <div class="diff-col__title">旧版本 r{{ diffResult.oldVersion }}</div>
              <div
                v-for="(l, i) in diffResult.oldLines"
                :key="'o' + i"
                class="diff-line"
                :class="lineClass(l.type)"
              >
                <span class="diff-line__num">{{ l.num }}</span>
                <span class="diff-line__text">{{ l.text || ' ' }}</span>
              </div>
            </div>
            <div class="diff-col">
              <div class="diff-col__title">新版本 r{{ diffResult.newVersion }}</div>
              <div
                v-for="(l, i) in diffResult.newLines"
                :key="'n' + i"
                class="diff-line"
                :class="lineClass(l.type)"
              >
                <span class="diff-line__num">{{ l.num }}</span>
                <span class="diff-line__text">{{ l.text || ' ' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 版本列表 -->
        <div class="rev-list">
          <div
            v-for="(v, i) in versions"
            :key="v.id"
            class="rev-row"
            :class="{ 'rev-row--current': i === 0, 'rev-row--selected': selectedVersions.includes(v.version) }"
          >
            <label class="rev-row__pick">
              <input
                type="checkbox"
                :checked="selectedVersions.includes(v.version)"
                @change="toggleSelect(v)"
              >
            </label>
            <div class="rev-row__main">
              <span class="rev-row__version">r{{ v.version }}</span>
              <span class="rev-row__time">{{ formatDate(v.created_at) }}</span>
              <span class="rev-row__author">用户 #{{ v.editor_id }}</span>
              <span v-if="v.is_minor" class="minor-tag" title="小编辑">m</span>
              <span class="rev-row__size">{{ contentSize(v) }}</span>
              <span class="rev-row__summary">{{ v.edit_summary || '（无编辑摘要）' }}</span>
            </div>
            <div class="rev-row__actions">
              <button
                v-if="userStore.isLoggedIn"
                class="row-link row-link--rollback"
                type="button"
                :disabled="restoring === v.version"
                @click="rollback(v)"
              >
                {{ restoring === v.version ? '回滚中...' : '回滚到此版本' }}
              </button>
              <span v-if="i === 0" class="current-badge">当前版本</span>
            </div>
          </div>

          <div v-if="versions.length === 0" class="empty-state">
            该页面暂无版本记录。
          </div>
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.history-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}

.history-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 40px;
  background: var(--canvas-background-color);
  min-height: 60vh;
}

.history-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 6px;
}
.history-subtitle {
  font-size: 13px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 20px;
}

.diff-box {
  border: 1px solid var(--border-color);
  margin-bottom: 20px;
}
.diff-box__header {
  padding: 8px 12px;
  background: var(--canvas-secondary-background-color);
  border-bottom: 1px solid var(--border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
}
.diff-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow-x: auto;
}
.diff-col {
  min-width: 0;
}
.diff-col + .diff-col {
  border-left: 1px solid var(--border-color-light);
}
.diff-col__title {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--canvas-text-secondary-background-color);
  border-bottom: 1px solid var(--border-color-light);
  background: var(--canvas-secondary-background-color);
}
.diff-line {
  display: flex;
  font-family: var(--font-monospace);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.diff-line__num {
  flex-shrink: 0;
  width: 40px;
  padding-right: 8px;
  text-align: right;
  color: var(--canvas-text-secondary-background-color);
  user-select: none;
}
.diff-line__text {
  flex: 1;
  padding-right: 12px;
}
/* 删除行红色背景，新增行绿色背景 */
.diff-line--removed {
  background: var(--color-error-bg);
  color: var(--color-error);
}
.diff-line--added {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.rev-list { border: 1px solid var(--border-color); }
.rev-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color-light);
}
.rev-row:last-child { border-bottom: none; }
.rev-row--current { background: var(--highlight-background-color); }
.rev-row--selected { background: var(--canvas-secondary-background-color); }
.rev-row__pick { display: flex; align-items: center; cursor: pointer; }
.rev-row__main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
  flex: 1;
}
.rev-row__version {
  font-family: var(--font-monospace);
  font-size: 12px;
  font-weight: 700;
  color: var(--hyperlink-background-color);
}
.rev-row__time { font-size: 12px; color: var(--canvas-text-secondary-background-color); white-space: nowrap; }
.rev-row__author { font-size: 12px; color: var(--canvas-text-secondary-background-color); white-space: nowrap; }
.rev-row__size { font-size: 11px; color: var(--canvas-text-secondary-background-color); white-space: nowrap; }
.rev-row__summary { font-size: 13px; color: var(--canvas-text-background-color); flex: 1; min-width: 0; }
.minor-tag {
  display: inline-grid;
  place-items: center;
  width: 16px; height: 16px;
  font-size: 10px;
  font-weight: 700;
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color);
  color: var(--canvas-text-secondary-background-color);
}
.rev-row__actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.row-link {
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font-body);
  padding: 0;
}
.row-link--rollback { color: var(--hyperlink-background-color); }
.row-link--rollback:hover { text-decoration: underline; }
.row-link:disabled { opacity: 0.5; cursor: not-allowed; }
.current-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  background: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  color: var(--color-success);
}

@media (max-width: 768px) {
  .history-container { padding: 16px; }
  .rev-row { flex-direction: column; align-items: flex-start; }
  .diff-columns { grid-template-columns: 1fr; }
  .diff-col + .diff-col { border-left: none; border-top: 1px solid var(--border-color-light); }
}
</style>
