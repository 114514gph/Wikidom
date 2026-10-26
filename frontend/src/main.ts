import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import './assets/main.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  // 应用启动时恢复登录态（等待完成后再挂载，保证路由守卫拿到正确的用户状态）
  const userStore = useUserStore()
  await userStore.fetchCurrentUser()

  app.mount('#app')
}

bootstrap()
