<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isRegister = computed(() => route.path.startsWith('/register'))

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

function validate(): string {
  if (!username.value.trim()) return '请输入用户名。'
  if (password.value.length < 6) return '密码至少需要 6 位。'
  if (isRegister.value) {
    if (!email.value.trim()) return '请输入邮箱地址。'
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email.value.trim())) return '邮箱格式不正确。'
    if (password.value !== confirmPassword.value) return '两次输入的密码不一致。'
  }
  return ''
}

async function submit() {
  error.value = ''
  const msg = validate()
  if (msg) {
    error.value = msg
    return
  }
  loading.value = true
  try {
    if (isRegister.value) {
      await userStore.register(username.value.trim(), email.value.trim(), password.value)
    } else {
      await userStore.login(username.value.trim(), password.value)
    }
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || (isRegister.value ? '注册失败，请稍后重试。' : '登录失败，请检查用户名和密码。')
  } finally {
    loading.value = false
  }
}

function switchMode() {
  error.value = ''
  router.push(isRegister.value ? '/login' : '/register')
}
</script>

<template>
  <div class="auth-page">
    <GlobalNav />

    <div class="auth-card">
      <div class="auth-card__logo">
        <div class="auth-card__logo-mark">W</div>
        <span class="auth-card__logo-text">Wikidom</span>
      </div>

      <!-- 模式 Tab -->
      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ 'auth-tab--active': !isRegister }"
          type="button"
          @click="!isRegister || switchMode()"
        >登录</button>
        <button
          class="auth-tab"
          :class="{ 'auth-tab--active': isRegister }"
          type="button"
          @click="isRegister || switchMode()"
        >注册</button>
      </div>

      <form @submit.prevent="submit">
        <div v-if="error" class="alert alert--error">
          <span>!</span><span>{{ error }}</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            class="form-input"
            type="text"
            placeholder="输入你的用户名"
            autocomplete="username"
          />
        </div>

        <div v-if="isRegister" class="form-group">
          <label class="form-label" for="email">邮箱</label>
          <input
            id="email"
            v-model="email"
            class="form-input"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">密码</label>
          <div class="password-wrap">
            <input
              id="password"
              v-model="password"
              class="form-input"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="isRegister ? '至少 6 位' : '输入你的密码'"
              autocomplete="current-password"
            />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </button>
          </div>
        </div>

        <div v-if="isRegister" class="form-group">
          <label class="form-label" for="confirmPassword">确认密码</label>
          <div class="password-wrap">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              class="form-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="再次输入密码"
              autocomplete="new-password"
            />
          </div>
        </div>

        <button class="btn btn--primary btn--lg w-full mt-2" type="submit" :disabled="loading">
          {{ loading ? '请稍候...' : (isRegister ? '创建账号' : '登录') }}
        </button>
      </form>

      <div class="auth-footer-text">
        {{ isRegister ? '已有账号？' : '还没有账号？' }}
        <a href="#" @click.prevent="switchMode">
          {{ isRegister ? '去登录' : '立即注册' }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-card__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}
.auth-card__logo-mark {
  width: 40px;
  height: 40px;
  background: var(--fandom-purple);
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
}
.password-wrap {
  position: relative;
}
.password-wrap .form-input {
  padding-right: 64px;
}
.password-toggle {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  min-height: 44px;
  width: 56px;
  border: none;
  border-left: 1px solid var(--border-color-light);
  background: var(--canvas-secondary-background-color);
  color: var(--canvas-text-secondary-background-color);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.password-toggle:hover {
  color: var(--hyperlink-background-color);
}
</style>
