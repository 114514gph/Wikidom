<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pagesApi, type Page } from '@/api/pages'
import { usersApi, type PublicUser } from '@/api/users'
import { categoriesApi } from '@/api/categories'

const router = useRouter()

const loading = ref(true)
const error = ref('')

const pageTotal = ref(0)
const userTotal = ref(0)
const categoryTotal = ref(0)
const todayEdits = ref(0)

const recentPages = ref<Page[]>([])
const recentUsers = ref<PublicUser[]>([])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [pagesRes, usersRes, catsRes, recentRes] = await Promise.all([
      pagesApi.list({ limit: 1 }),
      usersApi.list(1, 1),
      categoriesApi.list(1, 1),
      pagesApi.list({ sort: 'updated', limit: 5 })
    ])
    pageTotal.value = pagesRes.total
    userTotal.value = usersRes.total
    categoryTotal.value = catsRes.total
    recentPages.value = recentRes.pages

    // 今日编辑数：从最近更新的文章中统计今天更新的数量
    const today = new Date().toDateString()
    todayEdits.value = recentRes.pages.filter(p =>
      new Date(p.updated_at).toDateString() === today
    ).length

    // 最近注册用户
    const usersList = await usersApi.list(1, 5)
    recentUsers.value = usersList.users
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '加载数据失败'
  } finally {
    loading.value = false
  }
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

onMounted(loadData)
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">概览</h1>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="alert alert--error">{{ error }}</div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card__icon">▤</div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ pageTotal }}</div>
            <div class="stat-card__label">文章总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon">◉</div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ userTotal }}</div>
            <div class="stat-card__label">用户总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon">☰</div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ categoryTotal }}</div>
            <div class="stat-card__label">分类总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon">▦</div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ todayEdits }}</div>
            <div class="stat-card__label">今日编辑数</div>
          </div>
        </div>
      </div>

      <!-- 最近活动 & 最近用户 -->
      <div class="overview-grid">
        <div class="overview-section">
          <h2 class="overview-section__title">最近更新的文章</h2>
          <div v-if="recentPages.length === 0" class="empty-state">暂无文章</div>
          <div v-else class="activity-list">
            <div v-for="page in recentPages" :key="page.id" class="activity-item">
              <div class="activity-item__main">
                <a :href="`/wiki/${page.namespace === 'main' ? '' : page.namespace + ':'}${page.slug}`"
                   @click.prevent="router.push(`/wiki/${page.namespace === 'main' ? '' : page.namespace + ':'}${page.slug}`)">
                  {{ page.title }}
                </a>
                <span v-if="page.namespace !== 'main'" class="namespace-tag">{{ page.namespace }}</span>
              </div>
              <div class="activity-item__time">{{ formatDate(page.updated_at) }}</div>
            </div>
          </div>
        </div>

        <div class="overview-section">
          <h2 class="overview-section__title">最近注册用户</h2>
          <div v-if="recentUsers.length === 0" class="empty-state">暂无用户</div>
          <div v-else class="activity-list">
            <div v-for="user in recentUsers" :key="user.id" class="activity-item">
              <div class="activity-item__main">
                <a @click.prevent="router.push(`/user/${encodeURIComponent(user.username)}`)"
                   style="cursor:pointer">
                  {{ user.display_name || user.username }}
                </a>
                <span class="role-tag" :class="'role-tag--' + user.role">{{ user.role }}</span>
              </div>
              <div class="activity-item__time">
                {{ user.created_at ? formatDate(user.created_at) : '未知' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="overview-section">
        <h2 class="overview-section__title">快捷操作</h2>
        <div class="quick-actions">
          <button class="btn btn--primary" @click="router.push('/admin/pages')">管理页面</button>
          <button class="btn" @click="router.push('/admin/users')">管理用户</button>
          <button class="btn" @click="router.push('/admin/trash')">回收站</button>
          <button class="btn" @click="router.push('/wiki/Main_Page/edit')">编辑主页</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-panel {
  padding: 24px;
  background: var(--desktop-background-color);
  min-height: calc(100vh - var(--global-nav-height));
}

.admin-panel__header {
  margin-bottom: 20px;
}

.admin-panel__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-card__icon {
  width: 44px;
  height: 44px;
  background: var(--fandom-purple);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  line-height: 1.1;
}

.stat-card__label {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
}

.overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.overview-section {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 16px;
  margin-bottom: 16px;
}

.overview-section__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-light);
}

.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color-light);
  gap: 12px;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-item__main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.activity-item__main a {
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-item__time {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  white-space: nowrap;
  flex-shrink: 0;
}

.namespace-tag {
  font-size: 10px;
  padding: 1px 5px;
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color-light);
  color: var(--canvas-text-secondary-background-color);
}

.role-tag {
  font-size: 10px;
  padding: 1px 5px;
  font-weight: 600;
}

.role-tag--admin {
  background: #fdecea;
  color: #d33;
  border: 1px solid #d33;
}

.role-tag--moderator {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #e65100;
}

.role-tag--user {
  background: #eaf3ff;
  color: #006ee6;
  border: 1px solid #006ee6;
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

@media (max-width: 1024px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-panel {
    padding: 16px;
  }

  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-card__value {
    font-size: 22px;
  }
}
</style>
