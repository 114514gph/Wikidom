<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  slug: string
  activeTab: 'article' | 'discussion' | 'history' | 'edit'
}>()

const tabs = computed(() => [
  { key: 'article' as const, label: '文章', to: `/wiki/${props.slug}` },
  { key: 'discussion' as const, label: '讨论', to: `/wiki/${props.slug}/discussion` },
  { key: 'history' as const, label: '历史', to: `/wiki/${props.slug}/history` }
])
</script>

<template>
  <div class="page-tabs">
    <div class="page-tabs__inner">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.key"
        class="page-tabs__tab"
        :class="{ 'page-tabs__tab--active': activeTab === tab.key }"
        :to="tab.to"
      >
        {{ tab.label }}
      </RouterLink>

      <div class="page-tabs__spacer"></div>

      <div class="page-tabs__actions">
        <RouterLink
          class="page-tabs__action"
          :to="`/wiki/${slug}/history`"
        >
          历史版本
        </RouterLink>
        <RouterLink
          class="page-tabs__action page-tabs__action--primary"
          :class="{ 'page-tabs__action--primary': true }"
          :to="`/wiki/${slug}/edit`"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M17 3l4 4L7 21l-4 1 1-4L17 3z" />
          </svg>
          编辑
        </RouterLink>
      </div>
    </div>
  </div>
</template>
