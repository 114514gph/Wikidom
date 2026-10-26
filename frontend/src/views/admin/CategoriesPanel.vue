<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { categoriesApi, type Category } from '@/api/categories'

const router = useRouter()

const loading = ref(false)
const error = ref('')
const success = ref('')

const categories = ref<Category[]>([])

const showCreate = ref(false)
const newCategoryName = ref('')
const creating = ref(false)

async function loadCategories() {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await categoriesApi.list(1, 100)
    categories.value = res.categories
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '加载分类列表失败'
  } finally {
    loading.value = false
  }
}

async function createCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  creating.value = true
  error.value = ''
  try {
    await categoriesApi.create(name)
    success.value = `分类 "${name}" 已创建`
    newCategoryName.value = ''
    showCreate.value = false
    await loadCategories()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '创建分类失败'
  } finally {
    creating.value = false
  }
}

async function deleteCategory(cat: Category) {
  if (!confirm(`确定要删除分类 "${cat.name}" 吗？该分类与所有页面的关联将被移除。`)) return
  try {
    await categoriesApi.remove(cat.name)
    success.value = `分类 "${cat.name}" 已删除`
    await loadCategories()
  } catch (e: unknown) {
    const err = e as { message?: string; error?: string }
    error.value = err.message || err.error || '删除分类失败'
  }
}

function viewCategory(cat: Category) {
  router.push(`/category/${encodeURIComponent(cat.name)}`)
}

onMounted(loadCategories)
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">分类管理</h1>
    </div>

    <div class="toolbar">
      <button class="btn btn--primary btn--sm" @click="showCreate = !showCreate">
        {{ showCreate ? '取消' : '创建新分类' }}
      </button>
    </div>

    <!-- 创建分类表单 -->
    <div v-if="showCreate" class="create-form">
      <div class="form-group">
        <label class="form-label">分类名称</label>
        <input
          v-model="newCategoryName"
          class="form-input"
          type="text"
          placeholder="输入分类名称"
          @keyup.enter="createCategory"
        />
      </div>
      <button class="btn btn--primary btn--sm" :disabled="creating || !newCategoryName.trim()" @click="createCategory">
        {{ creating ? '创建中...' : '创建' }}
      </button>
    </div>

    <div v-if="success" class="alert alert--success">{{ success }}</div>
    <div v-if="error" class="alert alert--error">{{ error }}</div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div v-if="categories.length === 0" class="empty-state">暂无分类</div>

      <div v-else class="table-wrapper">
        <table class="wikitable">
          <thead>
            <tr>
              <th>ID</th>
              <th>分类名称</th>
              <th>页面数量</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id">
              <td>{{ cat.id }}</td>
              <td>{{ cat.name }}</td>
              <td>{{ cat.page_count }}</td>
              <td class="action-cell">
                <button class="btn btn--sm" @click="viewCategory(cat)">查看页面</button>
                <button class="btn btn--sm btn--danger" @click="deleteCategory(cat)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
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

.toolbar {
  margin-bottom: 16px;
}

.create-form {
  background: var(--canvas-background-color);
  border: 1px solid var(--border-color-light);
  padding: 16px;
  margin-bottom: 16px;
}

.action-cell {
  white-space: nowrap;
  display: flex;
  gap: 4px;
}

@media (max-width: 768px) {
  .admin-panel {
    padding: 16px;
  }
}
</style>
