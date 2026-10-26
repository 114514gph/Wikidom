import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页' }
    },
    {
      path: '/wiki/:slug',
      name: 'article',
      component: () => import('@/views/ArticleView.vue'),
      meta: { title: '文章' }
    },
    {
      path: '/wiki/:slug/edit',
      name: 'edit',
      component: () => import('@/views/EditView.vue'),
      meta: { title: '编辑', requiresAuth: true }
    },
    {
      path: '/wiki/:slug/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: '历史' }
    },
    {
      path: '/wiki/:slug/discussion',
      name: 'discussion',
      component: () => import('@/views/DiscussionView.vue'),
      meta: { title: '讨论' }
    },
    {
      path: '/category/:name',
      name: 'category',
      component: () => import('@/views/CategoryView.vue'),
      meta: { title: '分类' }
    },
    {
      path: '/user/:username',
      name: 'user',
      component: () => import('@/views/UserView.vue'),
      meta: { title: '用户' }
    },
    {
      path: '/user/:username/talk',
      name: 'user-talk',
      component: () => import('@/views/UserTalkView.vue'),
      meta: { title: '用户留言板' }
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/views/TemplateListView.vue'),
      meta: { title: '模板列表' }
    },
    {
      path: '/help-center',
      name: 'help-center',
      component: () => import('@/views/HelpCenterView.vue'),
      meta: { title: '帮助中心' }
    },
    {
      path: '/trash',
      name: 'trash',
      component: () => import('@/views/TrashView.vue'),
      meta: { title: '回收站', requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/admin/AdminDashboard.vue'),
      meta: { title: '管理后台', requiresAdmin: true },
      children: [
        { path: '', name: 'admin-overview', component: () => import('@/views/admin/OverviewPanel.vue') },
        { path: 'pages', name: 'admin-pages', component: () => import('@/views/admin/PagesPanel.vue') },
        { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UsersPanel.vue') },
        { path: 'categories', name: 'admin-categories', component: () => import('@/views/admin/CategoriesPanel.vue') },
        { path: 'permissions', name: 'admin-permissions', component: () => import('@/views/admin/PermissionsPanel.vue') },
        { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/SettingsPanel.vue') },
        { path: 'trash', name: 'admin-trash', component: () => import('@/views/admin/TrashPanel.vue') }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登录' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '注册' }
    },
    // 静态页面（页脚链接）
    { path: '/about', name: 'about', component: () => import('@/views/StaticPage.vue'), meta: { title: '关于' } },
    { path: '/community', name: 'community', component: () => import('@/views/StaticPage.vue'), meta: { title: '社区中心' } },
    { path: '/help', name: 'help', component: () => import('@/views/StaticPage.vue'), meta: { title: '帮助中心' } },
    { path: '/contact', name: 'contact', component: () => import('@/views/StaticPage.vue'), meta: { title: '联系我们' } },
    { path: '/terms', name: 'terms', component: () => import('@/views/StaticPage.vue'), meta: { title: '使用条款' } },
    { path: '/privacy', name: 'privacy', component: () => import('@/views/StaticPage.vue'), meta: { title: '隐私政策' } },
    { path: '/content-policy', name: 'content-policy', component: () => import('@/views/StaticPage.vue'), meta: { title: '内容政策' } },
    { path: '/dmca', name: 'dmca', component: () => import('@/views/StaticPage.vue'), meta: { title: 'DMCA' } },
    { path: '/api-docs', name: 'api-docs', component: () => import('@/views/StaticPage.vue'), meta: { title: 'API 文档' } },
    { path: '/developers', name: 'developers', component: () => import('@/views/StaticPage.vue'), meta: { title: '开发者中心' } },
    { path: '/status', name: 'status', component: () => import('@/views/StaticPage.vue'), meta: { title: '运行状态' } },
    {
      path: '/special/:page',
      name: 'special',
      component: () => import('@/views/special/SpecialView.vue'),
      meta: { title: '特殊页面' }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面未找到' }
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} | Wikidom`
  }

  const userStore = useUserStore()

  // 有 token 但尚未恢复用户信息时，先恢复（main.ts 已 await，此处兜底）
  if (userStore.token && !userStore.user) {
    await userStore.fetchCurrentUser()
  }

  // 已登录用户访问登录/注册页时跳首页
  if ((to.name === 'login' || to.name === 'register') && userStore.isLoggedIn) {
    return { name: 'home' }
  }

  // 需要登录
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 需要管理员
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return { name: 'home' }
  }

  return true
})

export default router
