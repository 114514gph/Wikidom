<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { searchApi, type SearchResult } from '@/api/search'

const emit = defineEmits<{
  (e: 'search', query: string): void
}>()

const router = useRouter()
const userStore = useUserStore()

const isMenuOpen = ref(false)
const isUserMenuOpen = ref(false)
const searchQuery = ref('')
const navRef = ref<HTMLElement | null>(null)

// 实时搜索下拉状态
const liveResults = ref<SearchResult[]>([])
const liveLoading = ref(false)
const showResults = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function closeMenus() {
  isMenuOpen.value = false
  isUserMenuOpen.value = false
  showResults.value = false
}

function onDocClick(e: MouseEvent) {
  if (navRef.value && !navRef.value.contains(e.target as Node)) {
    closeMenus()
  }
}

// 输入防抖 300ms 后调用搜索接口
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = searchQuery.value.trim()
  if (!q) {
    liveResults.value = []
    showResults.value = false
    liveLoading.value = false
    return
  }
  searchTimer = setTimeout(async () => {
    liveLoading.value = true
    try {
      const res = await searchApi.search(q, 8)
      liveResults.value = res.results
      showResults.value = true
    } catch {
      liveResults.value = []
    } finally {
      liveLoading.value = false
    }
  }, 300)
}

// 点击搜索结果：跳转到对应页面
function selectResult(slug: string) {
  closeMenus()
  searchQuery.value = ''
  liveResults.value = []
  router.push('/wiki/' + slug)
}

// 输入框聚焦时，若已有结果则重新展开下拉
function onSearchFocus() {
  if (liveResults.value.length) showResults.value = true
}

function goHome() {
  closeMenus()
  router.push('/')
}

function submitSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  closeMenus()
  // 由父视图决定如何处理搜索（首页内联展示 / 文章页跳转）
  emit('search', q)
}

function goLogin() {
  closeMenus()
  router.push('/login')
}

function goRegister() {
  closeMenus()
  router.push('/register')
}

function nav(to: string) {
  closeMenus()
  router.push(to)
}

function goProfile() {
  closeMenus()
  if (userStore.user) router.push('/user/' + encodeURIComponent(userStore.user.username))
}

function onLogout() {
  closeMenus()
  userStore.logout()
  router.push('/')
}

function initialOf(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <nav ref="navRef" class="global-navigation">
    <!-- 汉堡按钮（手机端） -->
    <button
      class="global-navigation__hamburger"
      type="button"
      aria-label="菜单"
      @click.stop="isMenuOpen = !isMenuOpen"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <!-- Logo -->
    <div class="global-navigation__logo" @click="goHome">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#FA005A" />
        <path d="M12 6l-6 3v6l6 3 6-3V9l-6-3z" fill="#FFC500" />
      </svg>
      <span class="global-navigation__logo-text">Wikidom</span>
    </div>

    <!-- 主导航链接（桌面端横排 / 手机端汉堡展开） -->
    <div class="global-navigation__links" :class="{ 'global-navigation__links--open': isMenuOpen }">
      <button class="global-navigation__link" type="button" @click="nav('/')">首页</button>
      <button class="global-navigation__link" type="button" @click="nav('/category/Levels')">分类</button>
      <button class="global-navigation__link" type="button" @click="nav('/wiki/Main_Page')">随机页面</button>
      <button class="global-navigation__link" type="button" @click="nav('/admin/trash')">回收站</button>
    </div>

    <!-- 搜索框 -->
    <div class="global-navigation__search">
      <svg class="global-navigation__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索所有页面..."
        autocomplete="off"
        @input="onSearchInput"
        @keyup.enter="submitSearch"
        @focus="onSearchFocus"
      />

      <!-- 实时搜索下拉结果 -->
      <div v-if="showResults" class="search-dropdown">
        <div v-if="liveLoading" class="search-dropdown__hint">搜索中...</div>
        <template v-else-if="liveResults.length">
          <button
            v-for="item in liveResults"
            :key="item.id"
            type="button"
            class="search-dropdown__item"
            @click="selectResult(item.slug)"
          >
            <span class="search-dropdown__title" v-html="item.title"></span>
            <span class="search-dropdown__snippet" v-html="item.snippet"></span>
          </button>
        </template>
        <div v-else-if="searchQuery.trim()" class="search-dropdown__hint">未找到相关页面</div>
      </div>
    </div>

    <!-- 右侧：登录/注册 或 用户头像下拉 -->
    <div class="global-navigation__right">
      <template v-if="!userStore.isLoggedIn">
        <button class="global-navigation__button global-navigation__button--ghost" type="button" @click="goLogin">登录</button>
        <button class="global-navigation__button global-navigation__button--primary" type="button" @click="goRegister">注册</button>
      </template>

      <div v-else class="global-navigation__user">
        <button
          class="global-navigation__avatar"
          type="button"
          :aria-label="userStore.user?.displayName || '用户'"
          @click.stop="isUserMenuOpen = !isUserMenuOpen"
        >
          {{ initialOf(userStore.user?.displayName || userStore.user?.username || '?') }}
        </button>

        <div v-if="isUserMenuOpen" class="global-navigation__dropdown">
          <button class="global-navigation__dropdown-item" type="button" @click="goProfile">
            {{ userStore.user?.displayName || userStore.user?.username }}
          </button>
          <button v-if="userStore.isAdmin" class="global-navigation__dropdown-item" type="button" @click="nav('/admin')">
            管理后台
          </button>
          <button class="global-navigation__dropdown-item global-navigation__dropdown-item--danger" type="button" @click="onLogout">
            退出登录
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* 实时搜索下拉 */
.search-dropdown {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  border-top: none;
  z-index: 1100;
  max-height: 360px;
  overflow-y: auto;
}

.search-dropdown__hint {
  padding: 12px 14px;
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
}

.search-dropdown__item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color-light);
  padding: 10px 14px;
  cursor: pointer;
}
.search-dropdown__item:last-child { border-bottom: none; }
.search-dropdown__item:hover {
  background: var(--canvas-secondary-background-color);
}

.search-dropdown__title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  margin-bottom: 2px;
}
.search-dropdown__item:hover .search-dropdown__title {
  color: var(--hyperlink-background-color);
}

.search-dropdown__snippet {
  display: block;
  font-size: 11px;
  color: var(--canvas-text-secondary-background-color);
  line-height: 1.5;
}

.search-dropdown :deep(mark) {
  background: #ffe58a;
  color: inherit;
  padding: 0 1px;
}
</style>
