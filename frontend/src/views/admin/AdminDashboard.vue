<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import Footer from '@/components/Footer.vue'

const route = useRoute()
const sidebarOpen = ref(false)

const navItems = [
  { to: '/admin', label: '概览', icon: 'dashboard', exact: true },
  { to: '/admin/pages', label: '页面', icon: 'file-text', exact: false },
  { to: '/admin/users', label: '用户', icon: 'users', exact: false },
  { to: '/admin/categories', label: '分类', icon: 'folder', exact: false },
  { to: '/admin/permissions', label: '权限', icon: 'shield', exact: false },
  { to: '/admin/settings', label: '设置', icon: 'settings', exact: false },
  { to: '/admin/trash', label: '回收站', icon: 'trash', exact: false }
]

function isActive(item: typeof navItems[0]) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="admin-layout">
    <GlobalNav />

    <div class="admin-body">
      <!-- 移动端汉堡按钮 -->
      <button
        class="admin-sidebar-toggle"
        type="button"
        aria-label="切换管理菜单"
        @click="toggleSidebar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>管理菜单</span>
      </button>

      <!-- 遮罩（移动端） -->
      <div
        v-if="sidebarOpen"
        class="admin-sidebar-overlay"
        @click="closeSidebar"
      ></div>

      <!-- 左侧管理导航 -->
      <aside class="admin-sidebar" :class="{ 'admin-sidebar--open': sidebarOpen }">
        <div class="admin-sidebar__header">
          <span class="admin-sidebar__title">管理后台</span>
        </div>
        <nav class="admin-sidebar__nav">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="admin-sidebar__link"
            :class="{ 'admin-sidebar__link--active': isActive(item) }"
            @click="closeSidebar"
          >
            <svg v-if="item.icon === 'dashboard'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <svg v-else-if="item.icon === 'file-text'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <svg v-else-if="item.icon === 'users'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <svg v-else-if="item.icon === 'folder'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <svg v-else-if="item.icon === 'shield'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <svg v-else-if="item.icon === 'settings'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <svg v-else-if="item.icon === 'trash'" class="admin-sidebar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <main class="admin-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
        <Footer />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-body {
  margin-top: var(--global-nav-height);
  display: flex;
  flex: 1;
  background: var(--desktop-background-color);
}

.admin-sidebar {
  width: 200px;
  flex-shrink: 0;
  background: #3a3a3a;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: var(--global-nav-height);
  height: calc(100vh - var(--global-nav-height));
  overflow-y: auto;
}

.admin-sidebar__header {
  padding: 16px;
  border-bottom: 1px solid #4a4a4a;
}

.admin-sidebar__title {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  font-family: var(--font-heading);
}

.admin-sidebar__nav {
  padding: 8px 0;
  flex: 1;
}

.admin-sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: #cccccc;
  border-left: 3px solid transparent;
  cursor: pointer;
}

.admin-sidebar__link:hover {
  background: #4a4a4a;
  color: #ffffff;
  text-decoration: none;
}

.admin-sidebar__link--active {
  background: #520044;
  color: #ffffff;
  border-left-color: var(--fandom-yellow);
}

.admin-sidebar__icon {
  width: 18px;
  text-align: center;
  font-size: 13px;
  flex-shrink: 0;
}

.admin-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-sidebar-toggle {
  display: none;
}

.admin-sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .admin-sidebar {
    position: fixed;
    left: -200px;
    top: var(--global-nav-height);
    z-index: 950;
    transition: left 0.2s;
    height: calc(100vh - var(--global-nav-height));
  }

  .admin-sidebar--open {
    left: 0;
  }

  .admin-sidebar-overlay {
    display: block;
    position: fixed;
    top: var(--global-nav-height);
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 940;
  }

  .admin-sidebar-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    position: fixed;
    top: calc(var(--global-nav-height) + 10px);
    left: 10px;
    z-index: 960;
    padding: 8px 14px;
    background: #3a3a3a;
    color: #ffffff;
    border: 1px solid #4a4a4a;
    font-size: 13px;
    cursor: pointer;
  }

  .admin-content {
    padding-top: 0;
  }
}
</style>
