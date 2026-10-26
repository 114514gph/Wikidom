<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { siteConfigApi } from '@/api/siteConfig'

const siteName = ref('')
const defaultSyntax = ref('markdown')
const siteDescription = ref('')
const themePrimary = ref('')

const loading = ref(false)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const cfg = await siteConfigApi.get()
    siteName.value = cfg.site_name || 'Wikidom'
    defaultSyntax.value = cfg.default_syntax || 'markdown'
    siteDescription.value = cfg.site_description || ''
    themePrimary.value = cfg.theme_primary || ''
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '加载站点配置失败'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    await siteConfigApi.update({
      site_name: siteName.value.trim(),
      site_description: siteDescription.value.trim(),
      default_syntax: defaultSyntax.value,
      theme_primary: themePrimary.value.trim(),
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">站点设置</h1>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>正在加载站点配置...</span>
    </div>

    <template v-else>
      <div v-if="saved" class="alert alert--success">设置已保存</div>
      <div v-if="error" class="alert alert--error">{{ error }}</div>

      <div class="settings-form">
        <div class="form-group">
          <label class="form-label">站点名称</label>
          <input v-model="siteName" class="form-input" type="text" placeholder="Wikidom" />
          <p class="form-hint">显示在站点头部和页面标题中。</p>
        </div>

        <div class="form-group">
          <label class="form-label">默认语法</label>
          <select v-model="defaultSyntax" class="form-select">
            <option value="markdown">Markdown</option>
            <option value="mediawiki">MediaWiki</option>
            <option value="wikidot">WikiDot</option>
          </select>
          <p class="form-hint">新建页面时默认使用的标记语法。</p>
        </div>

        <div class="form-group">
          <label class="form-label">站点描述</label>
          <textarea v-model="siteDescription" class="form-textarea" placeholder="输入站点描述..."></textarea>
          <p class="form-hint">显示在站点头部和页脚。</p>
        </div>

        <div class="form-group">
          <label class="form-label">主题色</label>
          <input v-model="themePrimary" class="form-input" type="text" placeholder="#00B7FF" />
          <p class="form-hint">十六进制颜色值，用于链接与主按钮。</p>
        </div>

        <div class="form-actions">
          <button class="btn btn--primary" :disabled="saving" @click="saveSettings">
            {{ saving ? '保存中...' : '保存设置' }}
          </button>
        </div>
      </div>

      <!-- 当前配置展示 -->
      <div class="current-config">
        <h2 class="section-title">当前配置</h2>
        <div class="table-wrapper">
          <table class="wikitable">
            <tbody>
              <tr>
                <td class="config-key">site_name</td>
                <td>{{ siteName || '-' }}</td>
              </tr>
              <tr>
                <td class="config-key">site_description</td>
                <td>{{ siteDescription || '-' }}</td>
              </tr>
              <tr>
                <td class="config-key">default_syntax</td>
                <td>{{ defaultSyntax }}</td>
              </tr>
              <tr>
                <td class="config-key">theme_primary</td>
                <td>{{ themePrimary || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
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

.settings-form {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 20px;
  margin-bottom: 24px;
}

.form-actions {
  margin-top: 8px;
}

.current-config {
  margin-top: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-light);
}

.config-key {
  font-family: var(--font-monospace);
  font-size: 12px;
  color: var(--canvas-text-secondary-background-color);
  width: 200px;
}

@media (max-width: 768px) {
  .admin-panel {
    padding: 16px;
  }

  .settings-form {
    padding: 16px;
  }
}
</style>
