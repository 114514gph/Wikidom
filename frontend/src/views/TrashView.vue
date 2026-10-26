<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import Footer from '@/components/Footer.vue'
import { trashApi, type TrashItem } from '@/api/trash'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(true)
const error = ref('')
const items = ref<TrashItem[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20

const restores = ref<number | null>(null)
const removes = ref<number | null>(null)
const actionMsg = ref('')
const actionErr = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function daysLeft(deletedAt: string): number {
  const d = new Date(deletedAt).getTime()
  if (isNaN(d)) return 30
  const elapsed = (Date.now() - d) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(30 - elapsed))
}

function daysTagClass(n: number): string {
  if (n <= 3) return 'days-tag--urgent'
  if (n <= 10) return 'days-tag--soon'
  return 'days-tag--normal'
}

async function loadTrash() {
  loading.value = true
  error.value = ''
  actionMsg.value = ''
  actionErr.value = ''
  try {
    const res = await trashApi.list(page.value, limit)
    items.value = res.items || []
    total.value = res.total || 0
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || '无法加载回收站内容。'
  } finally {
    loading.value = false
  }
}

async function restoreItem(item: TrashItem) {
  if (!confirm(`确定要恢复「${item.page_title}」吗？`)) return
  restores.value = item.id
  actionErr.value = ''
  actionMsg.value = ''
  try {
    const res = await trashApi.restore(item.id)
    actionMsg.value = res.message || `已恢复「${item.page_title}」。`
    await loadTrash()
  } catch (e: unknown) {
    const err = e as { message?: string }
    actionErr.value = err?.message || '恢复失败，可能你没有权限。'
  } finally {
    restores.value = null
  }
}

async function removeItem(item: TrashItem) {
  if (!confirm(`永久删除「${item.page_title}」？此操作不可撤销！`)) return
  if (!confirm(`再次确认：永久删除后无法恢复。确定继续？`)) return
  removes.value = item.id
  actionErr.value = ''
  actionMsg.value = ''
  try {
    const res = await trashApi.remove(item.id)
    actionMsg.value = res.message || `已永久删除「${item.page_title}」。`
    await loadTrash()
  } catch (e: unknown) {
    const err = e as { message?: string }
    actionErr.value = err?.message || '永久删除失败，需要管理员权限。'
  } finally {
    removes.value = null
  }
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  loadTrash()
}

onMounted(loadTrash)
</script>

<template>
  <div class="trash-page">
    <GlobalNav />
    <WikiHeader title="Wikidom" tagline="回收站" />

    <div class="trash-container">
      <h1 class="trash-title">回收站</h1>
      <p class="trash-desc">已删除的页面将保留 30 天，到期后永久删除。</p>

      <div v-if="actionMsg" class="alert alert--success"><span>{{ actionMsg }}</span></div>
      <div v-if="actionErr" class="alert alert--error"><span>{{ actionErr }}</span></div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>正在加载回收站...</span>
      </div>

      <div v-else-if="error" class="alert alert--error"><span>{{ error }}</span></div>

      <template v-else>
        <div v-if="items.length === 0" class="empty-state">
          回收站是空的，没有已删除的页面。
        </div>

        <div v-else class="table-wrapper">
          <table class="wikitable">
            <thead>
              <tr>
                <th>页面</th>
                <th>删除者</th>
                <th>删除时间</th>
                <th>删除原因</th>
                <th>剩余保留</th>
                <th style="text-align:right;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id">
                <td>
                  <span class="deleted-name">{{ item.page_title }}</span>
                </td>
                <td>{{ item.deleted_by_name || `用户 #${item.deleted_by}` }}</td>
                <td>{{ formatDate(item.deleted_at) }}</td>
                <td>{{ item.reason || '—' }}</td>
                <td>
                  <span class="days-tag" :class="daysTagClass(daysLeft(item.deleted_at))">
                    {{ daysLeft(item.deleted_at) }} 天
                  </span>
                </td>
                <td style="text-align:right; white-space:nowrap;">
                  <button
                    class="row-action row-action--restore"
                    type="button"
                    :disabled="restores === item.id"
                    @click="restoreItem(item)"
                  >
                    {{ restores === item.id ? '恢复中...' : '恢复' }}
                  </button>
                  <template v-if="userStore.isAdmin || item.deleted_by === userStore.user?.id">
                    <span class="row-sep">·</span>
                    <button
                      class="row-action row-action--delete"
                      type="button"
                      :disabled="removes === item.id"
                      @click="removeItem(item)"
                    >
                      {{ removes === item.id ? '删除中...' : '永久删除' }}
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="pagination__btn" :disabled="page <= 1" @click="goPage(page - 1)">
            &laquo;
          </button>
          <button
            v-for="p in totalPages"
            :key="p"
            class="pagination__btn"
            :class="{ 'pagination__btn--active': p === page }"
            @click="goPage(p)"
          >
            {{ p }}
          </button>
          <button class="pagination__btn" :disabled="page >= totalPages" @click="goPage(page + 1)">
            &raquo;
          </button>
        </div>
        <div v-if="items.length" class="pagination-info">
          第 {{ page }} / {{ totalPages }} 页，共 {{ total }} 个项目
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.trash-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}
.trash-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 40px;
  background: var(--canvas-background-color);
  min-height: 60vh;
}
.trash-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 4px;
}
.trash-desc {
  font-size: 13px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 18px;
}
.deleted-name {
  text-decoration: line-through;
  color: var(--canvas-text-secondary-background-color);
}
.days-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
}
.days-tag--urgent { color: var(--color-error); background: var(--color-error-bg); border: 1px solid var(--color-error-border); }
.days-tag--soon { color: #e65100; background: #fff3e0; border: 1px solid #e65100; }
.days-tag--normal { color: var(--color-success); background: var(--color-success-bg); border: 1px solid var(--color-success-border); }

.row-action {
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font-body);
  padding: 0;
}
.row-action--restore { color: var(--color-success); }
.row-action--restore:hover { text-decoration: underline; }
.row-action--delete { color: var(--color-error); }
.row-action--delete:hover { text-decoration: underline; }
.row-action:disabled { opacity: 0.5; cursor: not-allowed; }
.row-sep { color: var(--border-color); margin: 0 6px; }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 20px;
}
.pagination__btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  background: var(--canvas-background-color);
  color: var(--canvas-text-background-color);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
}
.pagination__btn:hover:not(:disabled) { background: var(--canvas-secondary-background-color); }
.pagination__btn--active {
  background: var(--hyperlink-background-color);
  color: #fff;
  border-color: var(--hyperlink-background-color);
}
.pagination__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-info {
  text-align: center;
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  margin-top: 8px;
}

@media (max-width: 768px) {
  .trash-container { padding: 16px; }
}
</style>
