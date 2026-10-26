<script setup lang="ts">
const roles = [
  { name: 'user', label: '普通用户', color: 'blue' },
  { name: 'moderator', label: '巡查员', color: 'orange' },
  { name: 'admin', label: '管理员', color: 'red' }
]

const permissions = [
  { key: 'edit', label: '编辑页面', desc: '创建和编辑文章内容' },
  { key: 'delete', label: '删除页面', desc: '将页面移至回收站' },
  { key: 'revert', label: '回滚版本', desc: '恢复到历史版本' },
  { key: 'manage_users', label: '管理用户', desc: '查看和修改用户角色' },
  { key: 'manage_categories', label: '管理分类', desc: '创建和删除分类' },
  { key: 'permanent_delete', label: '永久删除', desc: '从回收站彻底删除页面' }
]

// 权限矩阵：角色 -> 权限 -> 是否允许
const matrix: Record<string, Record<string, boolean>> = {
  user: {
    edit: true,
    delete: false,
    revert: false,
    manage_users: false,
    manage_categories: false,
    permanent_delete: false
  },
  moderator: {
    edit: true,
    delete: true,
    revert: true,
    manage_users: false,
    manage_categories: true,
    permanent_delete: false
  },
  admin: {
    edit: true,
    delete: true,
    revert: true,
    manage_users: true,
    manage_categories: true,
    permanent_delete: true
  }
}

const roleDescriptions: Record<string, string> = {
  user: '已注册的普通社区成员，可以编辑页面。',
  moderator: '社区巡查员，负责内容审核和分类管理，可删除和回滚页面。',
  admin: '站点管理员，拥有所有权限，包括用户管理和永久删除。'
}
</script>

<template>
  <div class="admin-panel">
    <div class="admin-panel__header">
      <h1 class="admin-panel__title">权限管理</h1>
    </div>

    <!-- 权限矩阵表格 -->
    <div class="table-wrapper">
      <table class="wikitable">
        <thead>
          <tr>
            <th>权限</th>
            <th v-for="role in roles" :key="role.name">
              <span class="role-tag" :class="'role-tag--' + role.color">{{ role.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="perm in permissions" :key="perm.key">
            <td>
              <div class="perm-label">{{ perm.label }}</div>
              <div class="perm-desc">{{ perm.desc }}</div>
            </td>
            <td v-for="role in roles" :key="role.name" class="perm-cell">
              <span v-if="matrix[role.name][perm.key]" class="perm-check">✓</span>
              <span v-else class="perm-cross">✕</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 用户组说明 -->
    <div class="role-descriptions">
      <h2 class="section-title">用户组说明</h2>
      <div v-for="role in roles" :key="role.name" class="role-desc-item">
        <span class="role-tag" :class="'role-tag--' + role.color">{{ role.label }}</span>
        <p>{{ roleDescriptions[role.name] }}</p>
      </div>
    </div>
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

.perm-label {
  font-weight: 600;
  color: var(--canvas-text-background-color);
}

.perm-desc {
  font-size: 11px;
  color: var(--canvas-text-secondary-background-color);
  margin-top: 2px;
}

.perm-cell {
  text-align: center;
}

.perm-check {
  color: #1a8a3a;
  font-weight: 700;
  font-size: 16px;
}

.perm-cross {
  color: #d33;
  font-weight: 700;
  font-size: 16px;
}

.role-tag {
  display: inline-block;
  font-size: 11px;
  padding: 2px 8px;
  font-weight: 600;
}

.role-tag--red {
  background: #fdecea;
  color: #d33;
  border: 1px solid #d33;
}

.role-tag--orange {
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #e65100;
}

.role-tag--blue {
  background: #eaf3ff;
  color: #006ee6;
  border: 1px solid #006ee6;
}

.role-descriptions {
  margin-top: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--canvas-text-background-color);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color-light);
}

.role-desc-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.role-desc-item p {
  font-size: 13px;
  color: var(--canvas-text-background-color);
  line-height: 1.6;
}

@media (max-width: 768px) {
  .admin-panel {
    padding: 16px;
  }
}
</style>
