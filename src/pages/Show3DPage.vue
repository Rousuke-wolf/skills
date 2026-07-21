<template>
  <div ref="root"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { appState } from '../utils/state.js'

const root = ref(null)

onMounted(async () => {
  const { build3DPage } = await import('../page/show3D/index.js')
  root.value.innerHTML = build3DPage(appState._modelHasContent)
  window.__rebindScriptEvents?.()
  window.__bindComboEvents?.()
})
</script>
