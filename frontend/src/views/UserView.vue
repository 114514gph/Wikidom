<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import Footer from '@/components/Footer.vue'
import { usersApi, type PublicUser } from '@/api/users'
import { specialApi, type CreatedPageItem, type ContributionItem } from '@/api/special'
import { buildPagePath } from '@/utils/namespace'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const loading = ref(true)
const error = ref('')
const profile = ref<PublicUser | null>(null)

// 创建的文章 & 编辑历史
const createdPages = ref<CreatedPageItem[]>([])
const createdLoading = ref(false)
const contribs = ref<ContributionItem[]>([])
const contribsLoading = ref(false)

const isEditing = ref(false)
const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)

const form = ref({
  display_name: '',
  bio: '',
  avatar_url: ''
})

const username = computed(() => String(route.params.username || ''))

const isSelf = computed(() => {
  if (!userStore.user || !profile.value) return false
  return userStore.user.username === profile.value.username
})

const roleLabel = computed(() => {
  const r = profile.value?.role || ''
  if (r === 'admin') return '管理员'
  if (r === 'moderator') return '监督员'
  if (r === 'bureaucrat') return '行政员'
  return '注册用户'
})

const avatarChar = computed(() => {
  const n = profile.value?.display_name || profile.value?.username || '?'
  return (n || '?').trim().charAt(0).toUpperCase()
})

function formatDate(iso?: string | null): string {
  if (!iso) return '未知'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 根据命名空间 + slug 构造 wiki 路径，失败时兜底回 /wiki/:slug
function wikiPath(item: { namespace?: string | null; slug: string }): string {
  try {
    return buildPagePath({ namespace: item.namespace || 'main', slug: item.slug })
  } catch {
    return '/wiki/' + encodeURIComponent(item.slug)
  }
}

async function loadUserData(name: string) {
  // 创建的文章 & 编辑历史：各自独立降级，互不影响
  createdLoading.value = true
  createdPages.value = []
  specialApi.created(name, { limit: 20 })
    .then((res) => { createdPages.value = res?.pages || [] })
    .catch(() => { createdPages.value = [] })
    .finally(() => { createdLoading.value = false })

  contribsLoading.value = true
  contribs.value = []
  specialApi.contributions(name, { limit: 20 })
    .then((res) => { contribs.value = res?.changes || [] })
    .catch(() => { contribs.value = [] })
    .finally(() => { contribsLoading.value = false })
}

async function loadProfile() {
  loading.value = true
  error.value = ''
  try {
    profile.value = await usersApi.get(username.value)
    await loadUserData(username.value)
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err?.message || '无法加载用户资料，该用户可能不存在。'
  } finally {
    loading.value = false
  }
}

function startEdit() {
  if (!profile.value) return
  form.value = {
    display_name: profile.value.display_name || '',
    bio: profile.value.bio || '',
    avatar_url: profile.value.avatar_url || ''
  }
  saveError.value = ''
  saveOk.value = false
  isEditing.value = true
}

async function saveEdit() {
  if (!profile.value) return
  saving.value = true
  saveError.value = ''
  saveOk.value = false
  try {
    const updated = await userStore.updateProfile({
      displayName: form.value.display_name || undefined,
      bio: form.value.bio || undefined,
      avatarUrl: form.value.avatar_url || undefined
    })
    // 同步更新本地展示
    profile.value = {
      ...profile.value,
      display_name: updated?.displayName ?? profile.value.display_name,
      bio: updated?.bio ?? profile.value.bio,
      avatar_url: updated?.avatarUrl ?? profile.value.avatar_url
    }
    isEditing.value = false
    saveOk.value = true
  } catch (e: unknown) {
    const err = e as { message?: string }
    saveError.value = err?.message || '保存失败，请稍后重试。'
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
watch(() => route.params.username, loadProfile)
</script>

<template>
  <div class="user-page">
    <GlobalNav />

    <div class="user-banner"></div>

    <div class="user-container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>正在加载用户资料...</span>
      </div>

      <div v-else-if="error" class="alert alert--error" style="margin-top:-60px;position:relative;z-index:2;">
        <span>{{ error }}</span>
      </div>

      <template v-else-if="profile">
        <!-- 用户信息卡 -->
        <div class="user-card">
          <div class="user-card__avatar">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" :alt="profile.username" />
            <span v-else>{{ avatarChar }}</span>
          </div>
          <div class="user-card__main">
            <h1 class="user-card__name">{{ profile.display_name || profile.username }}</h1>
            <div class="user-card__tags">
              <span class="role-tag">{{ roleLabel }}</span>
              <span class="role-tag role-tag--muted">{{ profile.username }}</span>
            </div>
            <div class="user-card__meta">
              <span>注册于 <strong>{{ formatDate(profile.created_at) }}</strong></span>
              <span>最后登录 <strong>{{ formatDate(profile.last_login_at) }}</strong></span>
            </div>
          </div>
          <div v-if="isSelf" class="user-card__actions">
            <button v-if="!isEditing" class="btn btn--primary btn--sm" type="button" @click="startEdit">
              编辑资料
            </button>
          </div>
        </div>

        <div v-if="saveOk" class="alert alert--success mt-3">
          <span>资料已保存。</span>
        </div>

        <!-- 编辑表单 -->
        <div v-if="isEditing" class="edit-panel">
          <h3 class="edit-panel__title">编辑个人资料</h3>
          <div v-if="saveError" class="alert alert--error"><span>{{ saveError }}</span></div>
          <div class="form-group">
            <label class="form-label" for="f-display">显示名</label>
            <input id="f-display" v-model="form.display_name" type="text" class="form-input" placeholder="显示名" />
          </div>
          <div class="form-group">
            <label class="form-label" for="f-bio">简介</label>
            <textarea id="f-bio" v-model="form.bio" class="form-textarea" placeholder="介绍一下你自己..."></textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="f-avatar">头像 URL</label>
            <input id="f-avatar" v-model="form.avatar_url" type="text" class="form-input" placeholder="https://..." />
            <div class="form-hint">留空则使用首字母占位头像。</div>
          </div>
          <div class="edit-panel__actions">
            <button class="btn btn--primary" type="button" :disabled="saving" @click="saveEdit">
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <button class="btn" type="button" :disabled="saving" @click="isEditing = false">取消</button>
          </div>
        </div>

        <!-- 关于 -->
        <div class="panel">
          <h2 class="panel__title">关于 {{ profile.username }}</h2>
          <div class="bio-text">
            <p v-if="profile.bio">{{ profile.bio }}</p>
            <p v-else class="text-muted">该用户还没有填写简介。</p>
          </div>
        </div>

        <!-- 信息栏 -->
        <div class="info-grid">
          <div class="info-cell">
            <div class="info-cell__label">用户名</div>
            <div class="info-cell__value">{{ profile.username }}</div>
          </div>
          <div class="info-cell">
            <div class="info-cell__label">角色</div>
            <div class="info-cell__value">{{ roleLabel }}</div>
          </div>
          <div class="info-cell">
            <div class="info-cell__label">注册时间</div>
            <div class="info-cell__value">{{ formatDate(profile.created_at) }}</div>
          </div>
          <div class="info-cell">
            <div class="info-cell__label">最后登录</div>
            <div class="info-cell__value">{{ formatDate(profile.last_login_at) }}</div>
          </div>
        </div>

        <!-- 创建的文章 -->
        <div class="panel">
          <h2 class="panel__title">创建的文章</h2>
          <div v-if="createdLoading" class="panel-hint">
            <div class="spinner spinner--sm"></div>
            <span>正在加载...</span>
          </div>
          <div v-else-if="createdPages.length" class="page-list">
            <div v-for="p in createdPages" :key="p.id" class="page-list__item">
              <RouterLink class="page-list__title" :to="wikiPath(p)">{{ p.title }}</RouterLink>
              <span class="page-list__time">创建于 {{ formatDate(p.created_at) }}</span>
            </div>
          </div>
          <div v-else class="panel-hint text-muted">该用户还没有创建任何文章。</div>
        </div>

        <!-- 编辑历史 -->
        <div class="panel">
          <h2 class="panel__title">编辑历史</h2>
          <div v-if="contribsLoading" class="panel-hint">
            <div class="spinner spinner--sm"></div>
            <span>正在加载...</span>
          </div>
          <div v-else-if="contribs.length" class="page-list">
            <div v-for="(c, i) in contribs" :key="(c.page_id || c.page_id || i) + '-' + c.version" class="page-list__item page-list__item--column">
              <div class="contrib-main">
                <RouterLink class="page-list__title" :to="wikiPath(c)">{{ c.title }}</RouterLink>
                <span class="contrib-version">r{{ c.version }}</span>
              </div>
              <div class="contrib-meta">
                <span class="contrib-summary">{{ c.edit_summary || c.edit_summary || '（无摘要）' }}</span>
                <span class="page-list__time">{{ formatDate(c.created_at || c.created_at) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="panel-hint text-muted">该用户还没有编辑记录。</div>
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.user-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}

.user-banner {
  margin-top: var(--global-nav-height);
  height: 120px;
  background: var(--canvas-secondary-background-color);
  border-bottom: 1px solid var(--border-color-light);
}

.user-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 24px 40px;
}

.user-card {
  position: relative;
  margin-top: -56px;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 16px;
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.user-card__avatar {
  width: 96px;
  height: 96px;
  background: var(--fandom-purple);
  display: grid;
  place-items: center;
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
  overflow: hidden;
}
.user-card__avatar img { width: 100%; height: 100%; object-fit: cover; }

.user-card__main { flex: 1; padding-bottom: 4px; min-width: 0; }
.user-card__name {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  line-height: 1.1;
}
.user-card__tags { display: flex; gap: 6px; margin: 6px 0 8px; flex-wrap: wrap; }
.role-tag {
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color);
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--canvas-text-secondary-background-color);
}
.role-tag--muted { color: var(--hyperlink-background-color); }

.user-card__meta {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.user-card__meta strong { color: var(--canvas-text-background-color); font-weight: 600; }
.user-card__actions { flex-shrink: 0; }

.edit-panel {
  margin-top: 16px;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  padding: 20px;
}
.edit-panel__title {
  font-size: 15px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  margin-bottom: 16px;
  font-family: var(--font-heading);
}
.edit-panel__actions { display: flex; gap: 8px; }

.panel { margin-top: 20px; background: var(--canvas-background-color); border: 1px solid var(--border-color-light); padding: 20px; }
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
.bio-text { font-size: 14px; line-height: 1.6; color: var(--canvas-text-background-color); }
.bio-text p { margin-bottom: 10px; }

.info-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.info-cell {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  padding: 12px 14px;
}
.info-cell__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 4px;
}
.info-cell__value {
  font-size: 14px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  word-break: break-all;
}

@media (max-width: 1024px) {
  .info-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .user-card { flex-direction: column; align-items: flex-start; }
  .info-grid { grid-template-columns: 1fr; }
  .user-container { padding: 0 16px 32px; }
}

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
.page-list__item--column {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
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
.contrib-main {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.contrib-version {
  font-size: 11px;
  font-weight: 600;
  color: var(--canvas-text-secondary-background-color);
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color-light);
  padding: 0 6px;
  white-space: nowrap;
}
.contrib-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}
.contrib-summary {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.panel-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--canvas-text-secondary-background-color);
  padding: 6px 2px;
}
.panel-hint .spinner { width: 16px; height: 16px; border-width: 2px; }
</style>
