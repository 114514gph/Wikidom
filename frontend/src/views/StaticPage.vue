<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 运行状态实时数据
const statusData = ref<{
  overall: string
  overallText: string
  uptime: string
  lastDeployment: string
  checks: { name: string; status: string; latency?: number; message: string }[]
  timestamp: string
} | null>(null)
const statusLoading = ref(false)

async function loadStatus() {
  statusLoading.value = true
  try {
    const res = await fetch('/api/status')
    statusData.value = await res.json()
  } catch (e) {
    console.error('加载运行状态失败', e)
  } finally {
    statusLoading.value = false
  }
}

onMounted(() => {
  if (route.name === 'status') {
    loadStatus()
  }
})

// 静态页面内容配置
const pages: Record<string, { title: string; paragraphs: string[] }> = {
  about: {
    title: '关于 Wikidom',
    paragraphs: [
      '你是否有在 Wikidot 上等级太低无法创建帖子的困难？又是否有过在 Fandom 上无法完全管控自己帖子的尴尬？又是否因为那些条条框框无法激发自己的创意？',
      '那么 Wikidom 就是你最好的选择。在这里，规则是用来打破的。',
      '融合 Fandom 视觉体验与 WikiDot 功能深度，支持 MediaWiki、WikiDot 与 Markdown 三种语法统一渲染。基于 Cloudflare 全球边缘网络，极速访问，无需服务器维护。'
    ]
  },
  community: {
    title: '社区中心',
    paragraphs: [
      '欢迎加入 Wikidom 社区！这里是所有活跃编辑者和读者的聚集地。',
      '你可以通过讨论页与其他编辑者交流，通过最近更改了解全站动态。',
      '新编辑者请先阅读帮助中心的编辑指南。'
    ]
  },
  help: {
    title: '帮助中心',
    paragraphs: [
      '快速编辑：点击任意页面顶部的"编辑"按钮即可开始撰写。',
      '语法支持：MediaWiki 语法（==标题==）、WikiDot 语法（++标题）、Markdown（## 标题）均可使用。',
      '上传图片：编辑页工具栏点击"图片"按钮，选择本地图片即可上传到图床。',
      '遇到问题？在对应页面的讨论页提问，或联系管理员。'
    ]
  },
  contact: {
    title: '联系我们',
    paragraphs: [
      '如有问题、建议或合作意向，欢迎通过以下方式联系：',
      '- 在 GitHub 仓库提交 Issue',
      '- 在站点任意页面的讨论页留言',
      '- 联系管理员账号'
    ]
  },
  terms: {
    title: '使用条款',
    paragraphs: [
      '使用本站点即表示你同意遵守以下条款：',
      '1. 你发布的内容需对他人友好，禁止人身攻击、骚扰或发布违法内容。',
      '2. 你授予本站对你发布内容的非独占许可（基于 CC BY-SA 4.0 协议）。',
      '3. 管理员有权删除违反条款的内容并封禁相关账号。',
      '4. 本站按"现状"提供，不承担因使用本站产生的任何责任。'
    ]
  },
  privacy: {
    title: '隐私政策',
    paragraphs: [
      '我们重视你的隐私。本政策说明我们收集哪些数据以及如何使用：',
      '- 账号信息：用户名、邮箱（仅用于登录和通知）。',
      '- 编辑记录：所有页面编辑历史公开可见。',
      '- 我们不会向第三方出售你的个人数据。',
      '- 你可以随时联系管理员要求删除你的账号和数据。'
    ]
  },
  'content-policy': {
    title: '内容政策',
    paragraphs: [
      '本站点接受各类知识库内容，但需遵守以下规则：',
      '- 禁止发布侵权内容、恶意软件或违法信息。',
      '- 鼓励中立、客观的内容撰写风格。',
      '- 引用内容需注明来源。',
      '- 广告和推广内容需经管理员审核。'
    ]
  },
  dmca: {
    title: 'DMCA 版权声明',
    paragraphs: [
      '如果你认为本站内容侵犯了你的版权，请按以下流程处理：',
      '1. 向管理员提交侵权通知，包括：侵权内容的具体位置、你的版权证明、你的联系方式。',
      '2. 我们将在收到通知后 48 小时内审查并移除侵权内容。',
      '3. 如果你认为被误删，可以提交反通知。',
      '提交联系方式：通过 GitHub 仓库 Issue 或站点讨论页联系管理员。'
    ]
  },
  'api-docs': {
    title: 'API 文档',
    paragraphs: [
      'Wikidom 提供 RESTful API，可用于自动化编辑和数据导出。',
      '',
      '认证：在请求头中携带 Authorization: Bearer {token}。',
      '',
      '主要端点：',
      '- GET /api/pages - 页面列表',
      '- GET /api/pages/:namespace/:slug - 获取页面',
      '- POST /api/pages - 创建页面（需登录）',
      '- PUT /api/pages/:id - 更新页面（需登录）',
      '- GET /api/search?q=:keyword - 搜索',
      '- GET /api/recent - 最近更改',
      '- POST /api/upload - 上传图片',
      '',
      '完整端点列表请参考项目 README。'
    ]
  },
  developers: {
    title: '开发者中心',
    paragraphs: [
      'Wikidom 是开源项目，欢迎贡献代码！',
      '',
      '技术栈：',
      '- 前端：Vue 3 + TypeScript + Vite',
      '- 后端：Cloudflare Pages Functions',
      '- 数据库：Cloudflare D1 (SQLite)',
      '- 缓存：Cloudflare KV',
      '- 图片存储：GitHub 图床',
      '',
      '项目仓库：https://github.com/114514gph/wikidom',
      '图床仓库：https://github.com/114514gph/wikidom-assets'
    ]
  },
  status: {
    title: '运行状态',
    paragraphs: [
      '所有系统运行正常。',
      '',
      '- 页面服务：正常',
      '- 数据库：正常',
      '- 搜索：正常',
      '- 图片上传：正常',
      '',
      '上次检查：刚刚'
    ]
  }
}

const page = computed(() => {
  const key = route.name as string
  return pages[key] || { title: '页面', paragraphs: ['内容暂未填写。'] }
})
</script>

<template>
  <div class="static-page">
    <h1 class="static-page__title">{{ page.title }}</h1>

    <!-- 运行状态页面（动态） -->
    <div v-if="route.name === 'status'" class="status-page">
      <div v-if="statusLoading" class="status-loading">正在检测系统状态...</div>
      <template v-else-if="statusData">
        <div class="status-overall" :class="'status-overall--' + statusData.overall">
          <span class="status-dot"></span>
          <span class="status-text">{{ statusData.overallText }}</span>
        </div>
        <div class="status-meta">
          <span>运行率：{{ statusData.uptime }}</span>
          <span>上次部署：{{ statusData.lastDeployment }}</span>
          <span>检测时间：{{ new Date(statusData.timestamp).toLocaleTimeString() }}</span>
        </div>
        <div class="status-checks">
          <div v-for="check in statusData.checks" :key="check.name" class="status-check">
            <span class="status-check__dot" :class="'status-check__dot--' + check.status"></span>
            <span class="status-check__name">{{ check.name }}</span>
            <span class="status-check__message">{{ check.message }}</span>
          </div>
        </div>
        <button class="btn btn--sm" @click="loadStatus" style="margin-top: 16px;">重新检测</button>
      </template>
      <div v-else class="status-error">无法加载运行状态数据</div>
    </div>

    <!-- 其他静态页面 -->
    <div v-else class="static-page__content">
      <template v-for="(para, i) in page.paragraphs" :key="i">
        <p v-if="para">{{ para }}</p>
        <div v-else class="static-page__spacer"></div>
      </template>
    </div>
    <RouterLink to="/" class="static-page__back">&larr; 返回首页</RouterLink>
  </div>
</template>

<style scoped>
.static-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}
.static-page__title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}
.static-page__content p {
  line-height: 1.8;
  margin: 0 0 12px;
  font-size: 15px;
}
.static-page__spacer {
  height: 12px;
}
.static-page__back {
  display: inline-block;
  margin-top: 24px;
  color: var(--hyperlink-background-color, #00b7ff);
  text-decoration: none;
  font-size: 14px;
  transition: color 150ms ease;
}
.static-page__back:hover {
  text-decoration: underline;
}

/* 运行状态页面 */
.status-page { margin-bottom: 24px; }
.status-loading, .status-error {
  padding: 40px;
  text-align: center;
  color: var(--canvas-text-secondary-background-color, #6c757d);
}
.status-overall {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-radius: 4px;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}
.status-overall--operational { background: #e8f5e9; color: #2e7d32; }
.status-overall--degraded { background: #fff8e1; color: #c87600; }
.status-overall--down { background: #fdecea; color: #c62828; }
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.status-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--canvas-text-secondary-background-color, #6c757d);
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color-light, #e0e0e0);
}
.status-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.status-check {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--canvas-background-color, #fff);
  border: 1px solid var(--border-color-light, #e0e0e0);
  border-radius: 4px;
}
.status-check__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-check__dot--operational { background: #2e7d32; }
.status-check__dot--degraded { background: #c87600; }
.status-check__dot--down { background: #c62828; }
.status-check__name {
  font-weight: 500;
  min-width: 80px;
}
.status-check__message {
  color: var(--canvas-text-secondary-background-color, #6c757d);
  font-size: 13px;
}
</style>
