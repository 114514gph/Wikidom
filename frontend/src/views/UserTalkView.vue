<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { commentsApi, type CommentNode } from '@/api/comments'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

const username = ref('')

const talkPage = ref<Page | null>(null)
const resolving = ref(true)
const resolveError = ref('')

const comments = ref<CommentNode[]>([])
const commentsLoading = ref(false)

const newContent = ref('')
const submitting = ref(false)
const actionErr = ref('')
const actionMsg = ref('')

function displayName(node: CommentNode): string {
  return node.display_name || node.username || '匿名用户'
}

function formatTime(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : iso + 'Z')
  if (isNaN(d.getTime())) return iso
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return minutes + ' 分钟前'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + ' 小时前'
  const days = Math.floor(hours / 24)
  if (days < 30) return days + ' 天前'
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function loadComments(pageId: number) {
  commentsLoading.value = true
  try {
    const res = await commentsApi.list(pageId)
    comments.value = res.comments || []
  } catch {
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

// 进入时解析留言板页：不存在则视为空留言板（不硬建）
async function resolveTalkPage() {
  resolving.value = true
  resolveError.value = ''
  talkPage.value = null
  comments.value = []
  try {
    talkPage.value = await pagesApi.get(username.value, 'user_talk')
    await loadComments(talkPage.value.id)
  } catch (e: unknown) {
    const err = e as { status?: number }
    if (err.status === 404) {
      // 空留言板：page 为 null，留言时再按需创建
      talkPage.value = null
      comments.value = []
    } else {
      resolveError.value = '留言板加载失败，请稍后重试。'
    }
  } finally {
    resolving.value = false
  }
}

// 发表留言：必要时先确保留言板页存在
async function submitMessage() {
  const content = newContent.value.trim()
  if (!content || submitting.value) return
  submitting.value = true
  actionErr.value = ''
  actionMsg.value = ''
  try {
    let pageId = talkPage.value?.id
    if (!pageId) {
      try {
        const created = await pagesApi.create({
          title: username.value,
          namespace: 'user_talk',
          content: '',
          syntax: 'markdown'
        })
        talkPage.value = created
        pageId = created.id
      } catch {
        // 已存在等错误：再尝试按 username 取一次
        try {
          const existing = await pagesApi.get(username.value, 'user_talk')
          talkPage.value = existing
          pageId = existing.id
        } catch {
          throw new Error('无法创建留言板，请稍后重试。')
        }
      }
    }
    await commentsApi.create({ page_id: pageId, content })
    newContent.value = ''
    actionMsg.value = '留言已发布。'
    setTimeout(() => { actionMsg.value = '' }, 3000)
    await loadComments(pageId)
  } catch (e: unknown) {
    const err = e as { message?: string }
    actionErr.value = err.message || '发表失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  username.value = String(route.params.username || '')
  resolveTalkPage()
})
watch(() => route.params.username, (v) => {
  username.value = String(v || '')
  resolveTalkPage()
})
</script>

<template>
  <div class="talk-page">
    <GlobalNav />

    <div class="talk-container">
      <!-- 面包屑 -->
      <nav class="breadcrumb">
        <RouterLink :to="'/user/' + encodeURIComponent(username)">{{ username }}</RouterLink>
        <span class="breadcrumb__sep">/</span>
        <span class="breadcrumb__current">留言板</span>
      </nav>

      <h1 class="talk-title">{{ username }} 的留言板</h1>

      <div v-if="resolving" class="loading"><div class="spinner"></div><span>正在加载留言板...</span></div>
      <div v-else-if="resolveError" class="alert alert--error"><span>{{ resolveError }}</span></div>

      <template v-else>
        <div v-if="actionMsg" class="alert alert--success"><span>{{ actionMsg }}</span></div>
        <div v-if="actionErr" class="alert alert--error"><span>{{ actionErr }}</span></div>

        <!-- 发表框 -->
        <div v-if="userStore.isLoggedIn" class="composer">
          <textarea v-model="newContent" class="form-textarea" placeholder="给 {{ username }} 留个言..."></textarea>
          <div class="composer__actions">
            <button class="btn btn--primary" type="button" :disabled="!newContent.trim() || submitting" @click="submitMessage">
              {{ submitting ? '发送中...' : '发表留言' }}
            </button>
          </div>
        </div>
        <div v-else class="login-hint">
          <RouterLink to="/login">登录</RouterLink> 后可在此留言。
        </div>

        <!-- 留言列表 -->
        <div v-if="commentsLoading" class="loading"><div class="spinner"></div><span>加载留言...</span></div>
        <div v-else-if="comments.length" class="talk-list">
          <div v-for="c in comments" :key="c.id" class="talk-post">
            <div class="talk-post__avatar">{{ displayName(c).charAt(0).toUpperCase() }}</div>
            <div class="talk-post__body">
              <div class="talk-post__head">
                <span class="talk-post__author">{{ displayName(c) }}</span>
                <span class="talk-post__time">{{ formatTime(c.created_at) }}</span>
              </div>
              <div class="talk-post__content">{{ c.content }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">还没有留言，发表第一条留言吧。</div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.talk-page { background: var(--desktop-background-color); min-height: 100vh; }
.talk-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 48px;
  background: var(--canvas-background-color);
  min-height: 60vh;
}
.breadcrumb { font-size: 12px; color: var(--canvas-text-secondary-background-color); margin-bottom: 12px; }
.breadcrumb a { color: var(--canvas-text-secondary-background-color); }
.breadcrumb a:hover { color: var(--hyperlink-background-color); }
.breadcrumb__sep { margin: 0 4px; color: var(--border-color); }
.breadcrumb__current { color: var(--canvas-text-background-color); }

.talk-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 16px;
}

.composer {
  border: 1px solid var(--border-color);
  padding: 16px;
  margin-bottom: 16px;
  background: var(--canvas-secondary-background-color);
}
.composer__actions { display: flex; gap: 8px; margin-top: 10px; }
.login-hint { font-size: 13px; color: var(--canvas-text-secondary-background-color); margin-bottom: 16px; }
.login-hint a { color: var(--hyperlink-background-color); }

.talk-list { border: 1px solid var(--border-color); }
.talk-post {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-color-light);
}
.talk-post:last-child { border-bottom: none; }
.talk-post__avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: var(--fandom-purple);
  flex-shrink: 0;
}
.talk-post__body { flex: 1; min-width: 0; }
.talk-post__head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.talk-post__author { font-size: 13px; font-weight: 700; color: var(--canvas-text-background-color); }
.talk-post__time { font-size: 11px; color: var(--canvas-text-secondary-background-color); }
.talk-post__content { font-size: 14px; line-height: 1.6; color: var(--canvas-text-background-color); white-space: pre-wrap; }

@media (max-width: 640px) {
  .talk-container { padding: 16px; }
}
</style>
