<template>
  <div ref="root"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const root = ref(null)

onMounted(async () => {
  const { default: buildCulturePage } = await import('../page/culture/index.js')

  root.value.innerHTML = buildCulturePage()
  window.__rebindScriptEvents?.()
})
</script>
