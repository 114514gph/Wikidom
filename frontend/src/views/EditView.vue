<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GlobalNav from '@/components/GlobalNav.vue'
import WikiHeader from '@/components/WikiHeader.vue'
import PageTabs from '@/components/PageTabs.vue'
import Footer from '@/components/Footer.vue'
import { pagesApi, type Page } from '@/api/pages'
import { parseApi, type Syntax } from '@/api/parse'
import { uploadApi, fileToBase64 } from '@/api/upload'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 解析命名空间
const { parseTitle } = await import('@/utils/namespace')
const rawSlug = String(route.params.slug)
const { namespace, slug: realSlug } = parseTitle(rawSlug)
const titleFromSlug = computed(() => realSlug.replace(/_/g, ' '))

// 页面状态
const existingPage = ref<Page | null>(null)
const loading = ref(true)
const loadError = ref('')

// 页面是否受保护（兼容后端 snake_case 与前端 camelCase 字段）
const isPageProtected = computed(() => {
  const raw = existingPage.value as Record<string, unknown> | null
  return Boolean(raw?.is_protected ?? raw?.is_protected)
})
// 受保护且当前用户不是管理员时，禁止保存
const isEditBlocked = computed(() => isPageProtected.value && !userStore.isAdmin)

// 编辑器状态
const content = ref('')
const syntax = ref<Syntax>('markdown')
const mode = ref<'visual' | 'source'>('source')
const editSummary = ref('')
const isMinor = ref(false)

// 预览状态
const previewHtml = ref('')
const previewLoading = ref(false)
const previewCollapsed = ref(false)

// 保存状态
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref('')

// 图片上传状态
const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// 移动端布局状态（<768px 时使用编辑/预览切换）
const isMobile = ref(false)
const mobilePane = ref<'edit' | 'preview'>('edit')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function renderPreview() {
  if (!content.value.trim()) {
    previewHtml.value = ''
    return
  }
  previewLoading.value = true
  try {
    const res = await parseApi.render(content.value, syntax.value)
    previewHtml.value = res.html
  } catch {
    previewHtml.value = '<p style="color:#d33;">预览渲染失败</p>'
  } finally {
    previewLoading.value = false
  }
}

function schedulePreview() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    renderPreview()
  }, 500)
}

async function loadExisting() {
  loading.value = true
  loadError.value = ''
  try {
    const p = await pagesApi.get(realSlug, namespace)
    existingPage.value = p
    content.value = p.content || ''
    syntax.value = (p.syntax as Syntax) || 'markdown'
    await renderPreview()
  } catch (e: unknown) {
    // 找不到页面 = 新页面，使用默认内容
    // 不显示错误提示，因为创建新页面是正常流程
    content.value = ''
    syntax.value = 'markdown'
  } finally {
    loading.value = false
  }
}

async function save() {
  // 受保护页面仅管理员可保存（双保险，按钮层已禁用）
  if (isEditBlocked.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    if (existingPage.value) {
      await pagesApi.update(existingPage.value.id, {
        content: content.value,
        editSummary: editSummary.value,
        isMinor: isMinor.value
      })
    } else {
      await pagesApi.create({
        title: titleFromSlug.value,
        content: content.value,
        syntax: syntax.value
      })
    }
    saveSuccess.value = '保存成功，正在跳转...'
    setTimeout(() => {
      router.push('/wiki/' + rawSlug)
    }, 600)
  } catch (e: unknown) {
    const err = e as { message?: string }
    saveError.value = err.message || '保存失败，请稍后重试。'
  } finally {
    saving.value = false
  }
}

function cancel() {
  router.push('/wiki/' + rawSlug)
}

function onSearch(query: string) {
  router.push({ path: '/wiki/' + encodeURIComponent(query) })
}

// 工具栏：在选中文本前后包裹标记
function wrapSelection(before: string, after: string = '') {
  const ta = document.getElementById('editorSource') as HTMLTextAreaElement | null
  if (!ta) return
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = content.value.substring(start, end)
  content.value =
    content.value.substring(0, start) + before + selected + after + content.value.substring(end)
  nextTickFocus(ta, start + before.length, end + before.length)
}

function nextTickFocus(ta: HTMLTextAreaElement, start: number, end: number) {
  setTimeout(() => {
    ta.focus()
    ta.setSelectionRange(start, end)
  }, 0)
}

// ─── 图片上传 ───────────────────────────────────────────────

// 打开隐藏的文件选择器
function triggerFilePicker() {
  uploadError.value = ''
  fileInput.value?.click()
}

// 在 textarea 光标位置插入文本
function insertAtCursor(text: string) {
  const ta = document.getElementById('editorSource') as HTMLTextAreaElement | null
  if (!ta) {
    content.value += text
    nextTick(() => autoResize())
    return
  }
  const start = ta.selectionStart
  const end = ta.selectionEnd
  content.value = content.value.substring(0, start) + text + content.value.substring(end)
  nextTick(() => {
    ta.focus()
    ta.setSelectionRange(start + text.length, start + text.length)
    autoResize()
  })
}

// 处理单个图片文件：读取为 base64 -> 调用后端上传 -> 插入 Markdown 图片语法
async function handleImageFile(file: File) {
  uploadError.value = ''
  if (!file.type.startsWith('image/')) {
    uploadError.value = '只能上传图片文件'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = '图片大小不能超过 5MB'
    return
  }
  uploading.value = true
  try {
    const base64 = await fileToBase64(file)
    const res = await uploadApi.uploadImage(file.name, base64, file.type)
    const alt = file.name.replace(/\.[^.]+$/, '') || 'image'
    insertAtCursor(`![${alt}](${res.url})`)
  } catch (e: unknown) {
    const err = e as { error?: string; message?: string }
    uploadError.value = err.error || err.message || '图片上传失败，请稍后重试'
  } finally {
    uploading.value = false
    // 重置 input，允许再次选择同一文件
    if (fileInput.value) fileInput.value.value = ''
  }
}

// 文件选择器回调
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if (file) handleImageFile(file)
}

// 拖拽图片到编辑区
function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files && e.dataTransfer.files[0]
  if (file) handleImageFile(file)
}

// ─── textarea 高度自适应 ────────────────────────────────────
// 最小 300px，随输入增长，最大 80vh
function autoResize() {
  const ta = document.getElementById('editorSource') as HTMLTextAreaElement | null
  if (!ta) return
  ta.style.height = 'auto'
  const min = 300
  const max = window.innerHeight * 0.8
  const next = Math.max(min, Math.min(ta.scrollHeight, max))
  ta.style.height = next + 'px'
}

// ─── 移动端视口 ─────────────────────────────────────────────
function updateViewport() {
  isMobile.value = window.matchMedia('(max-width: 767px)').matches
}

watch([content, syntax], () => {
  schedulePreview()
  nextTick(() => autoResize())
})

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  loadExisting().then(() => nextTick(() => autoResize()))
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  window.removeEventListener('resize', updateViewport)
})
</script>

<template>
  <div class="edit-page">
    <GlobalNav @search="onSearch" />
    <WikiHeader title="Wikidom" tagline="在这里，规则是用来打破的" />

    <PageTabs :slug="rawSlug" active-tab="edit" />

    <!-- 隐藏的图片文件选择器 -->
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/gif,image/webp"
      style="display:none"
      @change="onFileChange"
    />

    <div class="editor-container">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>

      <template v-else>
        <div class="editor-breadcrumb">
          <RouterLink to="/">Wikidom</RouterLink> /
          <span>{{ existingPage ? existingPage.title : titleFromSlug }}</span>
        </div>

        <h1 class="editor-title">
          {{ existingPage ? '编辑' : '创建' }}：{{ existingPage ? existingPage.title : titleFromSlug }}
        </h1>
        <p class="editor-subtitle">
          你正在{{ existingPage ? '编辑' : '创建' }}此页面。保存前请先预览你的更改。
        </p>

        <div v-if="loadError" class="alert alert--warning">
          <span>!</span><span>{{ loadError }}</span>
        </div>

        <!-- 页面保护提示：受保护且非管理员时禁止编辑 -->
        <div v-if="isEditBlocked" class="alert alert--warning">
          <span>!</span><span>该页面已被保护，仅管理员可编辑。</span>
        </div>

        <!-- 语法选择器（下拉） -->
        <div class="edit-syntax-row">
          <label class="edit-syntax-label" for="syntaxSelect">语法：</label>
          <select id="syntaxSelect" v-model="syntax" class="form-select">
            <option value="markdown">Markdown</option>
            <option value="mediawiki">MediaWiki</option>
            <option value="wikidot">WikiDot</option>
          </select>
        </div>

        <!-- 模式切换 -->
        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ 'mode-tab--active': mode === 'visual' }"
            type="button"
            @click="mode = 'visual'"
          >可视化</button>
          <button
            class="mode-tab"
            :class="{ 'mode-tab--active': mode === 'source' }"
            type="button"
            @click="mode = 'source'"
          >源码</button>
        </div>

        <!-- 移动端：编辑 / 预览 切换（仅手机端显示） -->
        <div v-if="isMobile && mode === 'source'" class="mobile-pane-toggle">
          <button
            type="button"
            class="mobile-pane-toggle__btn"
            :class="{ 'mobile-pane-toggle__btn--active': mobilePane === 'edit' }"
            @click="mobilePane = 'edit'"
          >编辑</button>
          <button
            type="button"
            class="mobile-pane-toggle__btn"
            :class="{ 'mobile-pane-toggle__btn--active': mobilePane === 'preview' }"
            @click="mobilePane = 'preview'"
          >预览</button>
        </div>

        <!-- 工具栏（仅源码模式） -->
        <div
          v-if="mode === 'source'"
          class="editor-toolbar"
          :class="{ 'mobile-pane-hidden': isMobile && mobilePane === 'preview' }"
        >
          <div class="editor-toolbar__row">
            <button class="toolbar-btn" type="button" title="加粗" @click="wrapSelection('**', '**')"><b>B</b></button>
            <button class="toolbar-btn" type="button" title="斜体" @click="wrapSelection('*', '*')"><i>I</i></button>
            <div class="toolbar-sep"></div>
            <button class="toolbar-btn" type="button" title="标题" @click="wrapSelection('## ', '')">H2</button>
            <button class="toolbar-btn" type="button" title="列表" @click="wrapSelection('- ', '')">•</button>
            <div class="toolbar-sep"></div>
            <button class="toolbar-btn" type="button" title="链接" @click="wrapSelection('[', '](https://)')">链接</button>
            <button class="toolbar-btn" type="button" title="代码块" @click="wrapSelection('```\n', '\n```')">&lt;/&gt;</button>
            <div class="toolbar-sep"></div>
            <button
              class="toolbar-btn toolbar-btn--img"
              type="button"
              title="插入图片"
              :disabled="uploading"
              @click="triggerFilePicker"
            >{{ uploading ? '上传中...' : '图片' }}</button>
          </div>
        </div>

        <!-- 图片上传错误提示 -->
        <div v-if="uploadError" class="alert alert--error mt-3">
          <span>!</span><span>{{ uploadError }}</span>
        </div>

        <!-- 源码编辑区 -->
        <div
          v-if="mode === 'source'"
          class="editor-pane"
          :class="{ 'mobile-pane-hidden': isMobile && mobilePane === 'preview' }"
        >
          <textarea
            id="editorSource"
            v-model="content"
            class="editor-pane__source"
            spellcheck="false"
            placeholder="在此输入页面内容...（可直接拖拽图片到此处上传）"
            @input="autoResize"
            @dragover.prevent
            @drop.prevent="onDrop"
          ></textarea>
        </div>

        <!-- 可视化预览区 -->
        <div v-else class="editor-pane">
          <div class="editor-pane__visual mw-parser-output" :key="previewHtml" v-html="previewHtml || '<p style=\'color:#999;\'>暂无预览内容</p>'"></div>
        </div>

        <!-- 实时预览（源码模式下显示；手机端默认隐藏，由切换按钮控制） -->
        <div
          v-if="mode === 'source'"
          class="preview-section"
          :class="{ 'mobile-pane-hidden': isMobile && mobilePane === 'edit' }"
        >
          <div class="preview-section__header" @click="previewCollapsed = !previewCollapsed">
            <span class="preview-section__title">实时预览</span>
            <button class="preview-section__toggle" type="button">
              {{ previewCollapsed ? '显示' : '隐藏' }}
            </button>
          </div>
          <div v-show="!previewCollapsed" class="preview-section__body">
            <div v-if="previewLoading" class="loading">
              <div class="spinner"></div><span>预览渲染中...</span>
            </div>
            <div v-else class="mw-parser-output" :key="previewHtml" v-html="previewHtml || '<p style=\'color:#999;\'>输入内容后这里将显示预览</p>'"></div>
          </div>
        </div>

        <!-- 编辑摘要 -->
        <div class="edit-summary">
          <label class="edit-summary__label" for="editSummary">编辑摘要</label>
          <input
            id="editSummary"
            v-model="editSummary"
            class="edit-summary__input"
            type="text"
            placeholder="简要描述你做的更改..."
          />
        </div>

        <!-- 选项 -->
        <div class="edit-options">
          <label class="edit-option">
            <input type="checkbox" v-model="isMinor" />
            <span>小编辑</span>
          </label>
        </div>

        <!-- 状态提示 -->
        <div v-if="saveError" class="alert alert--error mt-3">
          <span>!</span><span>{{ saveError }}</span>
        </div>
        <div v-if="saveSuccess" class="alert alert--success mt-3">
          <span>✓</span><span>{{ saveSuccess }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="edit-actions">
          <button class="btn btn--ghost" type="button" @click="cancel">取消</button>
          <div class="edit-actions__spacer"></div>
          <button class="btn btn--primary" type="button" :disabled="saving || isEditBlocked" @click="save">
            {{ isEditBlocked ? '已被保护' : saving ? '保存中...' : '保存页面' }}
          </button>
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.edit-syntax-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.edit-syntax-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
}
.edit-options {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.edit-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--canvas-text-background-color);
  cursor: pointer;
}
.edit-option input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--hyperlink-background-color);
  cursor: pointer;
}
.edit-summary__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--canvas-text-background-color);
  margin-bottom: 6px;
}

/* 手机端：被切换按钮隐藏的面板（仅在 isMobile 时由模板加上此类） */
.mobile-pane-hidden { display: none; }

/* 移动端 编辑/预览 切换条 */
.mobile-pane-toggle {
  display: flex;
  gap: 0;
  margin: 12px 0;
  border: 1px solid var(--border-color);
  background: var(--canvas-background-color);
}
.mobile-pane-toggle__btn {
  flex: 1;
  min-height: 44px;
  padding: 10px 0;
  border: none;
  background: var(--canvas-secondary-background-color);
  color: var(--canvas-text-background-color);
  font-size: 14px;
  font-family: var(--font-body);
  cursor: pointer;
}
.mobile-pane-toggle__btn + .mobile-pane-toggle__btn {
  border-left: 1px solid var(--border-color-light);
}
.mobile-pane-toggle__btn--active {
  background: var(--highlight-background-color);
  color: var(--hyperlink-background-color);
  font-weight: 600;
}

/* 插入图片按钮在上传中态 */
.toolbar-btn--img { font-size: 12px; }
.toolbar-btn--img:disabled { opacity: 0.6; cursor: not-allowed; }

/* textarea 自适应高度（由 JS 设置内联 height，这里给基础高度） */
.editor-pane__source { min-height: 300px; max-height: 80vh; }

/* 手机端：保证工具栏按钮至少 44px 触摸区域 */
@media (max-width: 767px) {
  .editor-toolbar__row {
    padding: 6px;
    gap: 4px;
  }
  .toolbar-btn {
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    font-size: 14px;
  }
  .toolbar-sep { height: 24px; }
  .editor-pane__source { font-size: 14px; }
}

</style>
