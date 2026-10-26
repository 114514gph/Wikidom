<script lang="ts">
export interface TocItem {
  id: string
  text: string
  level: number
}
</script>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  items: TocItem[]
}>()

const collapsed = ref(false)

function scrollToHeading(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }
}
</script>

<template>
  <nav v-if="items && items.length" class="toc">
    <div class="toc__title">
      <span>目录</span>
      <button class="toc__toggle" type="button" @click="collapsed = !collapsed">
        {{ collapsed ? '显示' : '隐藏' }}
      </button>
    </div>
    <ul class="toc__list" :class="{ 'toc__list--collapsed': collapsed }">
      <li
        v-for="(item, i) in items"
        :key="item.id || i"
        :class="`toc-level-${item.level}`"
      >
        <a :href="`#${item.id}`" @click.prevent="scrollToHeading(item.id)">
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
