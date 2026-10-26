<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pagesApi, type Page } from '@/api/pages'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const success = ref('')

const pages = ref<Page[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const searchQuery = ref('')

const deleting = ref<Page | null>(null)

async function loadPages() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const params: { page: number; limit: number; sort: 'updated' | 'created' | 'title'; search?: string } = {
      page: page.value,
      limit,
      sort: 'updated'
    }
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }
    const res = await pagesApi.list(params)
    pages.value = res.pages
    total.value = res.total
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '加载页面列表失败'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  loadPages()
}

function onPageChange(p: number) {
  page.value = p
  loadPages()
}

function confirmDelete(page: Page) {
  deleting.value = page
}

async function doDelete() {
  if (!deleting.value) return
  try {
    await pagesApi.remove(deleting.value.id)
    success.value = `页面 "${deleting.value.title}" 已删除`
    deleting.value = null
    loadPages()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '删除失败'
    deleting.value = null
  }
}

function viewPage(page: Page) {
  const ns = page.namespace === 'main' ? '' : page.namespace + ':'
  router.push(`/wiki/${ns}${page.slug}`)
}

function editPage(page: Page) {
  const ns = page.namespace === 'main' ? '' : page.namespace + ':'
  router.push(`/wiki/${ns}${page.slug}/edit`)
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const totalPageCount = computed(() => Math.ceil(total.value / limit))

onMounted(loadPages)
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">页面管理</h1>
    </div>

    <!-- 搜索栏 -->
    <div class="toolbar">
      <input
        v-model="searchQuery"
        class="form-input toolbar__search"
        type="text"
        placeholder="按标题搜索..."
        @keyup.enter="onSearch"
      />
      <button class="btn btn--primary btn--sm" @click="onSearch">搜索</button>
    </div>

    <div v-if="success" class="alert alert--success">{{ success }}</div>
    <div v-if="error" class="alert alert--error">{{ error }}</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div v-if="pages.length === 0" class="empty-state">暂无页面</div>

      <div v-else class="table-wrapper">
        <table class="wikitable">
          <thead>
            <tr>
              <th>ID</th>
              <th>标题</th>
              <th>命名空间</th>
              <th>创建者ID</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in pages" :key="p.id">
              <td>{{ p.id }}</td>
              <td>{{ p.title }}</td>
              <td>
                <span v-if="p.namespace !== 'main'" class="namespace-tag">{{ p.namespace }}</span>
                <span v-else class="text-muted">main</span>
              </td>
              <td>{{ p.creator_id }}</td>
              <td class="text-muted">{{ formatDate(p.created_at) }}</td>
              <td class="text-muted">{{ formatDate(p.updated_at) }}</td>
              <td class="action-cell">
                <button class="btn btn--sm" @click="viewPage(p)">查看</button>
                <button class="btn btn--sm" @click="editPage(p)">编辑</button>
                <button class="btn btn--sm btn--danger" @click="confirmDelete(p)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPageCount > 1" class="pagination">
        <button
          class="btn btn--sm"
          :disabled="page <= 1"
          @click="onPageChange(page - 1)"
        >
          上一页
        </button>
        <span class="pagination__info">第 {{ page }} / {{ totalPageCount }} 页（共 {{ total }} 条）</span>
        <button
          class="btn btn--sm"
          :disabled="page >= totalPageCount"
          @click="onPageChange(page + 1)"
        >
          下一页
        </button>
      </div>
    </template>

    <!-- 删除确认对话框 -->
    <div v-if="deleting" class="modal-overlay" @click.self="deleting = null">
      <div class="modal">
        <h3 class="modal__title">确认删除</h3>
        <p class="modal__body">
          确定要删除页面 <strong>"{{ deleting.title }}"</strong> 吗？此操作可在回收站中恢复。
        </p>
        <div class="modal__actions">
          <button class="btn" @click="deleting = null">取消</button>
          <button class="btn btn--danger" @click="doDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-panel {
  padding: 24px;
  background: var(--desktop-background-color);
  min-height: calc(100vh - var(--global-nav-height));
}

.admin-panel__header {
  margin-bottom: 16px;
}

.admin-panel__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}

.toolbar__search {
  max-width: 320px;
}

.namespace-tag {
  font-size: 10px;
  padding: 1px 5px;
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color-light);
  color: var(--canvas-text-secondary-background-color);
}

.action-cell {
  white-space: nowrap;
  display: flex;
  gap: 4px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

.pagination__info {
  font-size: 13px;
  color: var(--canvas-text-secondary-background-color);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  padding: 24px;
  max-width: 440px;
  width: 90%;
}

.modal__title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  color: var(--canvas-text-background-color);
}

.modal__body {
  font-size: 13px;
  color: var(--canvas-text-background-color);
  margin-bottom: 20px;
  line-height: 1.6;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 768px) {
  .admin-panel {
    padding: 16px;
  }

  .toolbar__search {
    max-width: none;
  }
}
</style>
