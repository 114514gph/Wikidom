<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { trashApi, type TrashItem } from '@/api/trash'

const loading = ref(false)
const error = ref('')
const success = ref('')

const items = ref<TrashItem[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20

const permanentDeleteItem = ref<TrashItem | null>(null)

async function loadTrash() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await trashApi.list(page.value, limit)
    items.value = res.items
    total.value = res.total
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '加载回收站失败'
  } finally {
    loading.value = false
  }
}

async function restoreItem(item: TrashItem) {
  try {
    await trashApi.restore(item.id)
    success.value = `页面 "${item.page_title}" 已恢复`
    loadTrash()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '恢复失败'
  }
}

function confirmPermanentDelete(item: TrashItem) {
  permanentDeleteItem.value = item
}

async function doPermanentDelete() {
  if (!permanentDeleteItem.value) return
  try {
    await trashApi.remove(permanentDeleteItem.value.id)
    success.value = `页面 "${permanentDeleteItem.value.page_title}" 已永久删除`
    permanentDeleteItem.value = null
    loadTrash()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '永久删除失败'
    permanentDeleteItem.value = null
  }
}

function onPageChange(p: number) {
  page.value = p
  loadTrash()
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

onMounted(loadTrash)
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">回收站管理</h1>
    </div>

    <div class="alert alert--warning">
      管理员视图：显示所有用户删除的页面记录。普通用户只能看到自己删除的项目。
    </div>

    <div v-if="success" class="alert alert--success">{{ success }}</div>
    <div v-if="error" class="alert alert--error">{{ error }}</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div v-if="items.length === 0" class="empty-state">回收站为空</div>

      <div v-else class="table-wrapper">
        <table class="wikitable">
          <thead>
            <tr>
              <th>ID</th>
              <th>页面标题</th>
              <th>删除者</th>
              <th>删除时间</th>
              <th>原因</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.page_title }}</td>
              <td>{{ item.deleted_by_name || `用户 #${item.deleted_by}` }}</td>
              <td class="text-muted">{{ formatDate(item.deleted_at) }}</td>
              <td class="text-muted">{{ item.reason || '-' }}</td>
              <td class="action-cell">
                <button class="btn btn--sm" @click="restoreItem(item)">恢复</button>
                <button class="btn btn--sm btn--danger" @click="confirmPermanentDelete(item)">永久删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="totalPageCount > 1" class="pagination">
        <button class="btn btn--sm" :disabled="page <= 1" @click="onPageChange(page - 1)">上一页</button>
        <span class="pagination__info">第 {{ page }} / {{ totalPageCount }} 页（共 {{ total }} 条）</span>
        <button class="btn btn--sm" :disabled="page >= totalPageCount" @click="onPageChange(page + 1)">下一页</button>
      </div>
    </template>

    <!-- 永久删除确认 -->
    <div v-if="permanentDeleteItem" class="modal-overlay" @click.self="permanentDeleteItem = null">
      <div class="modal">
        <h3 class="modal__title">永久删除确认</h3>
        <p class="modal__body">
          确定要<strong>永久删除</strong>页面 <strong>"{{ permanentDeleteItem.page_title }}"</strong> 吗？
          <br><br>
          此操作不可撤销，页面将从回收站中彻底移除。
        </p>
        <div class="modal__actions">
          <button class="btn" @click="permanentDeleteItem = null">取消</button>
          <button class="btn btn--danger" @click="doPermanentDelete">永久删除</button>
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
}
</style>
