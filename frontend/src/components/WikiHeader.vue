<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    tagline?: string
  }>(),
  {
    title: 'Wikidom',
    tagline: '一个下一代 Wiki 平台'
  }
)
</script>

<template>
  <header class="community-header">
    <div class="community-header__inner">
      <div>
        <div class="community-header__wordmark">{{ title }}</div>
        <div v-if="tagline" class="community-header__tagline">{{ tagline }}</div>
      </div>
    </div>
  </header>
</template>
