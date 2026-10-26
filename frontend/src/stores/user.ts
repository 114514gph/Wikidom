import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import { usersApi, type PublicUser } from '@/api/users'

export interface User {
  id: number
  username: string
  role: string
  email?: string
  displayName?: string
  avatarUrl?: string | null
  bio?: string | null
  createdAt?: string
}

// 将后端 /users/* 返回的 snake_case 公开用户映射为前端 camelCase User
function fromPublicUser(p: PublicUser): Partial<User> {
  return {
    email: p.email,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    bio: p.bio,
    createdAt: p.created_at
  }
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('wikidom_token'))
  const isLoading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isModerator = computed(() => user.value?.role === 'admin' || user.value?.role === 'moderator')

  async function login(username: string, password: string) {
    isLoading.value = true
    try {
      const res = await authApi.login(username, password)
      token.value = res.token
      user.value = res.user
      localStorage.setItem('wikidom_token', res.token)
      return res
    } finally {
      isLoading.value = false
    }
  }

  async function register(username: string, email: string, password: string) {
    isLoading.value = true
    try {
      const res = await authApi.register(username, email, password)
      token.value = res.token
      user.value = res.user
      localStorage.setItem('wikidom_token', res.token)
      return res
    } finally {
      isLoading.value = false
    }
  }

  // 应用启动时恢复登录态：/auth/me 仅返回 {id,username,role}，再用 /users/:username 富化资料
  async function fetchCurrentUser() {
    if (!token.value) return
    try {
      const me = (await authApi.me()) as User
      let profile: Partial<User> = {}
      try {
        const pub = await usersApi.get(me.username)
        profile = fromPublicUser(pub)
      } catch {
        // 资料富化失败不影响登录态恢复
      }
      user.value = { ...me, ...profile }
    } catch {
      logout()
    }
  }

  async function updateProfile(data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    if (!user.value) return
    const updated = await usersApi.update(user.value.id, {
      display_name: data.displayName,
      bio: data.bio,
      avatar_url: data.avatarUrl
    })
    user.value = {
      ...user.value,
      displayName: updated.display_name ?? user.value.displayName,
      bio: updated.bio ?? user.value.bio,
      avatarUrl: updated.avatar_url ?? user.value.avatarUrl
    }
    return user.value
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('wikidom_token')
  }

  return {
    user,
    token,
    isLoading,
    isLoggedIn,
    isAdmin,
    isModerator,
    login,
    register,
    fetchCurrentUser,
    updateProfile,
    logout
  }
})
