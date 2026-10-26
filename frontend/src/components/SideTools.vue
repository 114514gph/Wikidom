<script lang="ts">
import Toc, { type TocItem } from './Toc.vue'

export interface PageStat {
  label: string
  value: string
}

export interface RelatedPage {
  title: string
  to?: string
}
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tocItems?: TocItem[]
    pageStats?: PageStat[]
    relatedPages?: RelatedPage[]
  }>(),
  {
    tocItems: () => [],
    pageStats: () => [],
    relatedPages: () => []
  }
)
</script>

<template>
  <aside class="page-side-tools">
    <Toc v-if="tocItems && tocItems.length" :items="tocItems" />

    <div v-if="pageStats && pageStats.length" class="side-card">
      <div class="side-card__title">页面信息</div>
      <div class="page-stats">
        <div v-for="(stat, i) in pageStats" :key="i" class="page-stats__row">
          <span class="page-stats__label">{{ stat.label }}</span>
          <span class="page-stats__value">{{ stat.value }}</span>
        </div>
      </div>
    </div>

    <div v-if="relatedPages && relatedPages.length" class="side-card">
      <div class="side-card__title">相关页面</div>
      <RouterLink
        v-for="(page, i) in relatedPages"
        :key="i"
        class="related-page"
        :to="page.to || '#'"
      >
        <div class="related-page__icon">■</div>
        <span>{{ page.title }}</span>
      </RouterLink>
    </div>
  </aside>
</template>
