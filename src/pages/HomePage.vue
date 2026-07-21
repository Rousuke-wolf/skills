<template>
  <div ref="root"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import buildHomePage from '../page/home/index.js'

const root = ref(null)

onMounted(() => {
  root.value.innerHTML = buildHomePage()
  window.__rebindScriptEvents?.()
})
</script>
