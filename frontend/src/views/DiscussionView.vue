<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { commentsApi, type CommentNode } from '@/api/comments'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const userStore = useUserStore()

// 解析命名空间
const { parseTitle } = await import('@/utils/namespace')
const rawSlug = String(route.params.slug || '')
const { namespace, slug: realSlug } = parseTitle(rawSlug)

const page = ref<Page | null>(null)
const pageLoading = ref(true)
const loadError = ref('')

// 评论列表
const comments = ref<CommentNode[]>([])
const commentsLoading = ref(false)
const commentsError = ref('')

// 展开的评论
const expandedId = ref<number | null>(null)

// 新评论表单
const showComposer = ref(false)
const newContent = ref('')
const submitting = ref(false)

// 回复表单
const replyToId = ref<number | null>(null)
const replyContent = ref('')

// 删除确认提示
const actionMsg = ref('')
const actionErr = ref('')

// 计算回复总数（含嵌套）
function countReplies(node: CommentNode): number {
  return node.replies.reduce((sum, r) => sum + 1 + countReplies(r), 0)
}

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
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function loadPage() {
  pageLoading.value = true
  loadError.value = ''
  try {
    page.value = await pagesApi.get(realSlug, namespace)
    await loadComments()
  } catch {
    page.value = null
    loadError.value = '页面不存在或无法加载。'
  } finally {
    pageLoading.value = false
  }
}

async function loadComments() {
  if (!page.value) return
  commentsLoading.value = true
  commentsError.value = ''
  try {
    const res = await commentsApi.list(page.value.id)
    comments.value = res.comments || []
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    commentsError.value = err.message || err.error || '评论加载失败'
  } finally {
    commentsLoading.value = false
  }
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
  replyToId.value = null
}

async function submitComment() {
  const content = newContent.value.trim()
  if (!content || !page.value) return
  submitting.value = true
  actionErr.value = ''
  try {
    await commentsApi.create({ page_id: page.value.id, content })
    newContent.value = ''
    showComposer.value = false
    await loadComments()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    actionErr.value = err.message || err.error || '发表失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

async function submitReply(parent: CommentNode) {
  const content = replyContent.value.trim()
  if (!content || !page.value) return
  submitting.value = true
  actionErr.value = ''
  try {
    await commentsApi.create({ page_id: page.value.id, content, parent_id: parent.id })
    replyContent.value = ''
    replyToId.value = null
    await loadComments()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    actionErr.value = err.message || err.error || '回复失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

async function removeComment(node: CommentNode) {
  if (!confirm('确定要删除这条评论吗？')) return
  try {
    await commentsApi.remove(node.id)
    actionMsg.value = '评论已删除'
    setTimeout(() => { actionMsg.value = '' }, 3000)
    await loadComments()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    actionErr.value = err.message || err.error || '删除失败'
  }
}

// 是否可删除该评论：本人评论，或管理员/版主
function canModerate(node: CommentNode): boolean {
  if (!userStore.user) return false
  if (node.user_id === userStore.user.id) return true
  return userStore.isModerator
}

onMounted(loadPage)
watch(() => route.params.slug, loadPage)
</script>

<template>
  <div class="discussion-page">
    <GlobalNav />
    <WikiHeader title="后室 Wiki" tagline="The Backrooms Encyclopedia" />
    <PageTabs v-if="rawSlug" :slug="rawSlug" active-tab="discussion" />

    <div class="discussion-container">
      <div v-if="pageLoading" class="loading">
        <div class="spinner"></div>
        <span>正在加载...</span>
      </div>

      <div v-else-if="loadError" class="alert alert--error"><span>{{ loadError }}</span></div>

      <template v-else>
        <h1 class="discussion-title">
          {{ page?.title || rawSlug }} — 讨论
        </h1>

        <div v-if="actionMsg" class="alert alert--success"><span>{{ actionMsg }}</span></div>
        <div v-if="actionErr" class="alert alert--error"><span>{{ actionErr }}</span></div>

        <!-- 工具栏 -->
        <div class="discussion-toolbar">
          <span class="thread-count">共 {{ comments.length }} 个评论</span>
          <div class="toolbar-spacer"></div>
          <button
            v-if="userStore.isLoggedIn"
            class="btn btn--primary btn--sm"
            type="button"
            @click="showComposer = !showComposer"
          >
            + 发表评论
          </button>
          <span v-else class="text-muted" style="font-size:12px;">登录后可发表评论和回复</span>
        </div>

        <!-- 新评论表单 -->
        <div v-if="showComposer && userStore.isLoggedIn" class="composer">
          <div class="form-group">
            <label class="form-label" for="c-body">评论内容</label>
            <textarea id="c-body" v-model="newContent" class="form-textarea" placeholder="写下你对本页的看法..."></textarea>
          </div>
          <div class="composer__actions">
            <button class="btn btn--primary" type="button" :disabled="!newContent.trim() || submitting" @click="submitComment">
              {{ submitting ? '发布中...' : '发布评论' }}
            </button>
            <button class="btn" type="button" @click="showComposer = false">取消</button>
          </div>
        </div>

        <div v-if="commentsLoading" class="loading">
          <div class="spinner"></div>
          <span>正在加载评论...</span>
        </div>
        <div v-else-if="commentsError" class="alert alert--error"><span>{{ commentsError }}</span></div>

        <!-- 评论列表 -->
        <div v-else class="thread-list">
          <div
            v-for="c in comments"
            :key="c.id"
            class="thread-card"
            :class="{ 'thread-card--open': expandedId === c.id }"
            @click="toggleExpand(c.id)"
          >
            <div class="thread-card__avatar">{{ displayName(c).charAt(0).toUpperCase() }}</div>
            <div class="thread-card__body">
              <div class="thread-card__top">
                <span class="thread-card__title">{{ displayName(c) }}</span>
              </div>
              <div class="thread-card__excerpt">{{ c.content }}</div>
              <div class="thread-card__meta">
                <span>{{ formatTime(c.created_at) }}</span>
              </div>
            </div>
            <div class="thread-card__stats">
              <div>{{ countReplies(c) }} 回复</div>
            </div>
          </div>

          <div v-if="comments.length === 0" class="empty-state">
            还没有评论，发表第一条评论吧。
          </div>
        </div>

        <!-- 展开的评论详情（含回复） -->
        <div v-if="expandedId !== null" class="thread-detail">
          <template v-for="c in comments" :key="c.id">
            <div v-if="c.id === expandedId">
              <!-- 首条评论 -->
              <div class="post">
                <div class="post__avatar">{{ displayName(c).charAt(0).toUpperCase() }}</div>
                <div class="post__body">
                  <div class="post__head">
                    <span class="post__author">{{ displayName(c) }}</span> · {{ formatTime(c.created_at) }}
                  </div>
                  <div class="post__content">{{ c.content }}</div>
                  <div v-if="canModerate(c)" class="post__actions">
                    <button class="row-link row-link--danger" type="button" @click.stop="removeComment(c)">删除</button>
                  </div>
                </div>
              </div>

              <!-- 回复列表（平铺展示嵌套树） -->
              <div v-for="r in c.replies" :key="r.id" class="post post--reply">
                <div class="post__avatar">{{ displayName(r).charAt(0).toUpperCase() }}</div>
                <div class="post__body">
                  <div class="post__head">
                    <span class="post__author">{{ displayName(r) }}</span> · {{ formatTime(r.created_at) }}
                  </div>
                  <div class="post__content">{{ r.content }}</div>
                  <div v-if="canModerate(r)" class="post__actions">
                    <button class="row-link row-link--danger" type="button" @click.stop="removeComment(r)">删除</button>
                  </div>
                </div>
              </div>

              <!-- 回复框 -->
              <div v-if="userStore.isLoggedIn" class="reply-box">
                <div v-if="replyToId === c.id">
                  <textarea
                    v-model="replyContent"
                    class="form-textarea"
                    placeholder="写下你的回复..."
                  ></textarea>
                  <div class="composer__actions mt-2">
                    <button class="btn btn--primary btn--sm" type="button" :disabled="!replyContent.trim() || submitting" @click="submitReply(c)">
                      {{ submitting ? '发送中...' : '发送回复' }}
                    </button>
                    <button class="btn btn--ghost btn--sm" type="button" @click="replyToId = null; replyContent = ''">
                      取消
                    </button>
                  </div>
                </div>
                <button v-else class="btn btn--secondary btn--sm" type="button" @click="replyToId = c.id">
                  回复
                </button>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.discussion-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}
.discussion-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 40px;
  background: var(--canvas-background-color);
  min-height: 60vh;
}
.discussion-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 16px;
}
.discussion-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.thread-count { font-size: 13px; color: var(--canvas-text-secondary-background-color); }
.toolbar-spacer { flex: 1; }

.composer {
  border: 1px solid var(--border-color);
  padding: 16px;
  margin-bottom: 16px;
  background: var(--canvas-secondary-background-color);
}
.composer__actions { display: flex; gap: 8px; }

.thread-list { border: 1px solid var(--border-color); }
.thread-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-color-light);
  cursor: pointer;
}
.thread-card:last-child { border-bottom: none; }
.thread-card:hover { background: var(--canvas-secondary-background-color); }
.thread-card--open { background: var(--highlight-background-color); }
.thread-card__avatar {
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
.thread-card__body { flex: 1; min-width: 0; }
.thread-card__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.thread-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
}
.thread-card__excerpt {
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 6px;
  line-height: 1.5;
}
.thread-card__meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--canvas-text-secondary-background-color);
}
.thread-card__stats {
  text-align: right;
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  flex-shrink: 0;
}

.thread-detail {
  margin-top: 20px;
  border: 1px solid var(--border-color);
  padding: 16px;
}

.post { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color-light); }
.post:last-of-type { border-bottom: none; }
.post__avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: var(--fandom-purple);
  flex-shrink: 0;
}
.post--reply .post__avatar { background: var(--fandom-dark-gray); }
.post__body { flex: 1; min-width: 0; }
.post__head { font-size: 12px; color: var(--canvas-text-secondary-background-color); margin-bottom: 4px; }
.post__author { font-weight: 700; color: var(--canvas-text-background-color); }
.post__content { font-size: 14px; line-height: 1.6; color: var(--canvas-text-background-color); white-space: pre-wrap; }
.post__actions { margin-top: 6px; }
.row-link {
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--font-body);
  padding: 0;
}
.row-link--danger { color: var(--fandom-red); }
.row-link--danger:hover { text-decoration: underline; }

.reply-box { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color-light); }

@media (max-width: 768px) {
  .discussion-container { padding: 16px; }
  .thread-card__stats { display: none; }
}
</style>
