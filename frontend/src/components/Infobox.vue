<script lang="ts">
export interface InfoboxField {
  label: string
  value: string
}
</script>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    image?: string | null
    fields?: InfoboxField[]
  }>(),
  {
    image: null,
    fields: () => []
  }
)
</script>

<template>
  <aside class="portable-infobox">
    <div class="pi-title">{{ title }}</div>

    <div v-if="image" class="pi-image">
      <img :src="image" :alt="title" />
    </div>
    <div v-else class="pi-image">[ 图片 ]</div>

    <div v-for="(field, i) in fields" :key="i" class="pi-data">
      <span class="pi-data-label">{{ field.label }}</span>
      <span class="pi-data-value" v-html="field.value"></span>
    </div>
  </aside>
</template>
