<script setup lang="ts">
import { ref, onMounted } from 'vue'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { buildPagePath, stripPrefix } from '@/utils/namespace'

const loading = ref(true)
const error = ref('')
const helpPages = ref<Page[]>([])
const showSyntax = ref(true)
const guideRef = ref<HTMLElement | null>(null)
const pagesRef = ref<HTMLElement | null>(null)

function scrollTo(el: HTMLElement | null) {
  el?.scrollIntoView({ behavior: 'smooth' })
}

// 三语法对照表：Markdown / MediaWiki / WikiDot
const syntaxRows: { feature: string; markdown: string; mediawiki: string; wikidot: string }[] = [
  { feature: '一级标题', markdown: '# 标题', mediawiki: '= 标题 =', wikidot: '+++ 标题' },
  { feature: '二级标题', markdown: '## 标题', mediawiki: '== 标题 ==', wikidot: '++ 标题' },
  { feature: '三级标题', markdown: '### 标题', mediawiki: '=== 标题 ===', wikidot: '+ 标题' },
  { feature: '粗体', markdown: '**粗体**', mediawiki: "'''粗体'''", wikidot: '**粗体**' },
  { feature: '斜体', markdown: '*斜体*', mediawiki: "''斜体''", wikidot: '//斜体//' },
  { feature: '页内链接', markdown: '[文字](/wiki/页面)', mediawiki: '[[页面]] 或 [[页面|文字]]', wikidot: '[[页面]] 或 [[页面|文字]]' },
  { feature: '外部链接', markdown: '[文字](https://)', mediawiki: '[https:// 文字]', wikidot: '[[https:// 文字]]' },
  { feature: '无序列表', markdown: '- 项目', mediawiki: '* 项目', wikidot: '- 项目' },
  { feature: '有序列表', markdown: '1. 项目', mediawiki: '# 项目', wikidot: '+ 项目' },
  { feature: '引用块', markdown: '> 引用内容', mediawiki: '<blockquote>引用内容</blockquote>', wikidot: '> 引用内容' },
  { feature: '行内代码', markdown: '`code`', mediawiki: '<code>code</code>', wikidot: '@@code@@' },
  { feature: '代码块', markdown: '```lang ... ```', mediawiki: '<syntaxhighlight lang="lang">...</syntaxhighlight>', wikidot: '[[code type="lang"]]...[[/code]]' },
  { feature: '图片', markdown: '![alt](https://img)', mediawiki: '[[File:image.png|说明]]', wikidot: '{{image:file.png|说明}}' },
  { feature: '模板调用', markdown: '（不支持）', mediawiki: '{{模板|参数=值}}', wikidot: '{{模板|参数=值}}' },
  { feature: '分类', markdown: '<!-- 不支持 -->', mediawiki: '[[分类:名称]]', wikidot: '[[category:名称]]' }
]

function helpPath(p: Page): string {
  try {
    return buildPagePath({ namespace: 'help', slug: p.slug })
  } catch {
    return '/wiki/Help:' + encodeURIComponent(p.slug)
  }
}

function nameOf(p: Page): string {
  try {
    return stripPrefix(p.title) || p.slug.replace(/_/g, ' ')
  } catch {
    return p.slug.replace(/_/g, ' ')
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await pagesApi.list({ namespace: 'help', limit: 100 })
    helpPages.value = (res.pages || []).slice().sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  } catch (e: unknown) {
    const err = e as { message?: string }
    error.value = err.message || '加载帮助页面失败。'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="help-page">
    <GlobalNav />
    <WikiHeader title="Wikidom" tagline="在这里，规则是用来打破的" />

    <div class="help-container">
      <!-- 欢迎区 -->
      <div class="help-hero">
        <h1 class="help-hero__title">帮助中心</h1>
        <p class="help-hero__sub">在这里了解如何编辑页面、使用语法以及管理你的 Wiki。</p>
      </div>

      <!-- 三个入口卡片 -->
      <div class="help-cards">
        <button class="help-card" type="button" @click="showSyntax = false; $nextTick(() => scrollTo(guideRef))">
          <div class="help-card__title">编辑指南</div>
          <div class="help-card__desc">新建页面、上传图片、使用编辑器工具栏与保存更改。</div>
        </button>
        <button class="help-card" type="button" @click="showSyntax = !showSyntax">
          <div class="help-card__title">语法说明</div>
          <div class="help-card__desc">Markdown / MediaWiki / WikiDot 三种语法的写法对照。</div>
        </button>
        <button class="help-card" type="button" @click="$nextTick(() => scrollTo(pagesRef))">
          <div class="help-card__title">页面管理</div>
          <div class="help-card__desc">移动、保护、分类与历史版本回退等常用操作。</div>
        </button>
      </div>

      <!-- 编辑指南简述 -->
      <section ref="guideRef" class="help-section">
        <h2 class="section-heading">编辑指南</h2>
        <ol class="guide-list">
          <li>在任意页面点击右上角「编辑」进入编辑器，可在源码与可视化预览之间切换。</li>
          <li>使用工具栏可快速插入粗体、斜体、标题、列表、链接与代码块；图片可直接拖拽到编辑区上传。</li>
          <li>填写编辑摘要（简要描述本次更改），勾选「小编辑」可标记为不影响正文的修改。</li>
          <li>保存后可在「历史」页查看版本，并随时回退到任意旧版本。</li>
        </ol>
      </section>

      <!-- 三语法对照表 -->
      <section v-if="showSyntax" class="help-section">
        <h2 class="section-heading">语法对照（Markdown / MediaWiki / WikiDot）</h2>
        <div class="syntax-wrap">
          <table class="syntax-table">
            <thead>
              <tr><th>元素</th><th>Markdown</th><th>MediaWiki</th><th>WikiDot</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in syntaxRows" :key="row.feature">
                <td class="syntax-feature">{{ row.feature }}</td>
                <td><code>{{ row.markdown }}</code></td>
                <td><code>{{ row.mediawiki }}</code></td>
                <td><code>{{ row.wikidot }}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 动态帮助页面列表 -->
      <section ref="pagesRef" class="help-section">
        <h2 class="section-heading">可编辑的帮助页面</h2>
        <div v-if="loading" class="loading"><div class="spinner"></div><span>加载中...</span></div>
        <div v-else-if="error" class="alert alert--error"><span>{{ error }}</span></div>
        <div v-else-if="helpPages.length" class="help-page-list">
          <RouterLink v-for="p in helpPages" :key="p.id" class="help-page-item" :to="helpPath(p)">
            {{ nameOf(p) }}
          </RouterLink>
        </div>
        <div v-else class="empty-state">尚未创建帮助页面，你可以编辑下方任意一条帮助说明。</div>
      </section>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.help-page { background: var(--desktop-background-color); min-height: 100vh; }
.help-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 24px 24px 48px;
}
.help-hero { margin-bottom: 20px; }
.help-hero__title {
  font-size: 28px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
}
.help-hero__sub { font-size: 14px; color: var(--canvas-text-secondary-background-color); margin-top: 6px; }

.help-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.help-card {
  text-align: left;
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 16px;
  cursor: pointer;
  font-family: var(--font-body);
}
.help-card:hover { border-color: var(--hyperlink-background-color); background: var(--highlight-background-color); }
.help-card__title { font-size: 15px; font-weight: 700; color: var(--canvas-text-background-color); margin-bottom: 6px; }
.help-card__desc { font-size: 12px; color: var(--canvas-text-secondary-background-color); line-height: 1.5; }

.help-section { margin-bottom: 28px; }
.section-heading {
  font-size: 16px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  font-family: var(--font-heading);
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}
.guide-list { padding-left: 20px; display: grid; gap: 8px; font-size: 14px; color: var(--canvas-text-background-color); line-height: 1.6; }

.syntax-wrap { overflow-x: auto; border: 1px solid var(--border-color); }
.syntax-table { width: 100%; border-collapse: collapse; min-width: 640px; }
.syntax-table th, .syntax-table td {
  text-align: left;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border-color-light);
  font-size: 13px;
  vertical-align: top;
}
.syntax-table th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--canvas-text-secondary-background-color);
  background: var(--canvas-secondary-background-color);
}
.syntax-table td code {
  background: var(--canvas-secondary-background-color);
  border: 1px solid var(--border-color-light);
  padding: 1px 6px;
  font-size: 12px;
  word-break: break-all;
}
.syntax-feature { font-weight: 600; color: var(--canvas-text-background-color); white-space: nowrap; }

.help-page-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  border: 1px solid var(--border-color);
}
.help-page-item {
  padding: 10px 14px;
  font-size: 14px;
  color: var(--hyperlink-background-color);
  border-bottom: 1px solid var(--border-color-light);
}
.help-page-item:nth-last-child(-n+2) { border-bottom: none; }
.help-page-item:hover { background: var(--canvas-secondary-background-color); }

@media (max-width: 1024px) {
  .help-cards { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .help-container { padding: 16px; }
  .help-page-list { grid-template-columns: 1fr; }
  .help-page-item { border-bottom: 1px solid var(--border-color-light); }
  .help-page-item:last-child { border-bottom: none; }
}
</style>
