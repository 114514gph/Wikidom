<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usersApi, type PublicUser } from '@/api/users'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const success = ref('')

const users = ref<PublicUser[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const searchQuery = ref('')

const roleEditUser = ref<PublicUser | null>(null)
const newRole = ref('')
const newBanned = ref(false)
const newBanReason = ref('')
const savingUser = ref(false)

async function loadUsers() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await usersApi.list(page.value, limit)
    users.value = res.users
    total.value = res.total

    // 前端搜索过滤（后端 /users 无 search 参数）
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase()
      users.value = res.users.filter(u =>
        u.username.toLowerCase().includes(q) ||
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      )
    }
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '加载用户列表失败'
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  loadUsers()
}

function onPageChange(p: number) {
  page.value = p
  loadUsers()
}

function openRoleEdit(user: PublicUser) {
  roleEditUser.value = user
  newRole.value = user.role
  newBanned.value = !!user.is_banned
  newBanReason.value = user.ban_reason || ''
}

async function saveRole() {
  if (!roleEditUser.value) return
  savingUser.value = true
  error.value = ''
  success.value = ''
  try {
    const updated = await usersApi.adminUpdate(roleEditUser.value.id, {
      role: newRole.value as 'admin' | 'moderator' | 'user',
      is_banned: newBanned.value,
      ban_reason: newBanned.value ? newBanReason.value.trim() : '',
    })
    // 本地同步该行数据
    const idx = users.value.findIndex(u => u.id === updated.id)
    if (idx >= 0) users.value[idx] = updated
    success.value = `用户 "${updated.username}" 已更新：角色 ${updated.role}${updated.is_banned ? '（已封禁）' : ''}`
    roleEditUser.value = null
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '保存失败'
  } finally {
    savingUser.value = false
  }
}

function viewUser(user: PublicUser) {
  router.push(`/user/${encodeURIComponent(user.username)}`)
}

function formatDate(d: string | null | undefined) {
  if (!d) return '未知'
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const totalPageCount = computed(() => Math.ceil(total.value / limit))

onMounted(loadUsers)
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">用户管理</h1>
    </div>

    <!-- 搜索栏 -->
    <div class="toolbar">
      <input
        v-model="searchQuery"
        class="form-input toolbar__search"
        type="text"
        placeholder="搜索用户名、显示名或邮箱..."
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
      <div v-if="users.length === 0" class="empty-state">暂无用户</div>

      <div v-else class="table-wrapper">
        <table class="wikitable">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>邮箱</th>
              <th>显示名</th>
              <th>角色</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>最后登录</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.id }}</td>
              <td>{{ u.username }}</td>
              <td class="text-muted">{{ u.email || '-' }}</td>
              <td>{{ u.display_name || '-' }}</td>
              <td>
                <span class="role-tag" :class="'role-tag--' + u.role">{{ u.role }}</span>
              </td>
              <td>
                <span v-if="u.is_banned" class="ban-tag" :title="u.ban_reason || ''">已封禁</span>
                <span v-else class="text-muted">正常</span>
              </td>
              <td class="text-muted">{{ formatDate(u.created_at) }}</td>
              <td class="text-muted">{{ formatDate(u.last_login_at) }}</td>
              <td class="action-cell">
                <button class="btn btn--sm" @click="viewUser(u)">用户页</button>
                <button class="btn btn--sm" @click="openRoleEdit(u)">编辑角色</button>
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

    <!-- 角色与封禁编辑对话框 -->
    <div v-if="roleEditUser" class="modal-overlay" @click.self="roleEditUser = null">
      <div class="modal">
        <h3 class="modal__title">编辑用户</h3>
        <p class="modal__body">
          用户：<strong>{{ roleEditUser.username }}</strong><br>
          当前角色：<span class="role-tag" :class="'role-tag--' + roleEditUser.role">{{ roleEditUser.role }}</span>
        </p>
        <div class="form-group">
          <label class="form-label">角色</label>
          <select v-model="newRole" class="form-select">
            <option value="user">user（普通用户）</option>
            <option value="moderator">moderator（巡查员）</option>
            <option value="admin">admin（管理员）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label checkbox-label">
            <input type="checkbox" v-model="newBanned">
            封禁该用户
          </label>
        </div>
        <div v-if="newBanned" class="form-group">
          <label class="form-label">封禁原因</label>
          <input v-model="newBanReason" class="form-input" type="text" placeholder="填写封禁原因..." />
        </div>
        <div class="modal__actions">
          <button class="btn" @click="roleEditUser = null">取消</button>
          <button class="btn btn--primary" :disabled="savingUser" @click="saveRole">
            {{ savingUser ? '保存中...' : '保存' }}
          </button>
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

.role-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
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

.ban-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  font-weight: 600;
  background: #fdecea;
  color: #d33;
  border: 1px solid #d33;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--canvas-text-background-color);
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
  margin-bottom: 16px;
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
