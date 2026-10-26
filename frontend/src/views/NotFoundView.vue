<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import Footer from '@/components/Footer.vue'

const router = useRouter()
const keyword = ref('')

function doSearch() {
  const q = keyword.value.trim()
  if (!q) return
  router.push({ path: '/wiki/' + encodeURIComponent(q) })
}

function onSearch(query: string) {
  router.push({ path: '/wiki/' + encodeURIComponent(query) })
}
</script>

<template>
  <div class="notfound-page">
    <GlobalNav @search="onSearch" />

    <section class="notfound">
      <div class="notfound__inner">
        <div class="notfound__code">404</div>
        <h1 class="notfound__title">页面未找到</h1>
        <p class="notfound__desc">
          你访问的页面不存在、已被移动或删除。<br />
          试试下面的搜索，或从快捷入口继续浏览。
        </p>

        <div class="notfound__search">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索页面..."
            @keyup.enter="doSearch"
          />
          <button class="notfound__search-btn" type="button" aria-label="搜索" @click="doSearch">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        <div class="notfound__label">快捷入口</div>
        <div class="notfound__links">
          <RouterLink class="notfound__link" to="/">← 返回首页</RouterLink>
          <RouterLink class="notfound__link" to="/wiki/Main_Page">主页面</RouterLink>
          <RouterLink class="notfound__link" to="/category/Levels">浏览分类</RouterLink>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.notfound-page {
  background: var(--desktop-background-color);
  min-height: 100vh;
}
.notfound {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(var(--global-nav-height) + 48px) 20px 40px;
  text-align: center;
}
.notfound__code {
  font-size: 100px;
  font-weight: 700;
  color: var(--border-color);
  font-family: var(--font-heading);
  line-height: 1;
  letter-spacing: -4px;
  margin-bottom: 8px;
}
.notfound__title {
  font-size: 26px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 12px;
}
.notfound__desc {
  font-size: 14px;
  color: var(--canvas-text-secondary-background-color);
  line-height: 1.6;
  margin-bottom: 28px;
}
.notfound__search {
  position: relative;
  max-width: 480px;
  margin: 0 auto 28px;
}
.notfound__search input {
  width: 100%;
  height: 44px;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  padding: 0 48px 0 16px;
  font-size: 14px;
  font-family: var(--font-body);
  color: var(--canvas-text-background-color);
  outline: none;
}
.notfound__search input:focus {
  border-color: var(--hyperlink-background-color);
}
.notfound__search-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 44px;
  border: none;
  background: var(--hyperlink-background-color);
  color: #ffffff;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.notfound__search-btn:hover {
  background: #004ea6;
}
.notfound__label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--canvas-text-secondary-background-color);
  margin-bottom: 12px;
}
.notfound__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.notfound__link {
  padding: 8px 16px;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color);
  color: var(--canvas-text-background-color);
  font-size: 13px;
  font-weight: 500;
}
.notfound__link:hover {
  background: var(--highlight-background-color);
  color: var(--hyperlink-background-color);
  border-color: var(--hyperlink-background-color);
  text-decoration: none;
}
@media (max-width: 640px) {
  .notfound__code { font-size: 72px; }
  .notfound__title { font-size: 20px; }
}
</style>
