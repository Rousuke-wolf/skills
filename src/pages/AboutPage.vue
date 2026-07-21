<template>
  <div ref="root"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import buildAboutPage from '../page/about/index.js'
import '../page/about/index.css'

const root = ref(null)

onMounted(() => {
  root.value.innerHTML = buildAboutPage()
  window.__rebindScriptEvents?.()
})
</script>
