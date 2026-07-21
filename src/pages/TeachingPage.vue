<template>
  <div ref="root"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const root = ref(null)

onMounted(async () => {
  // 动态导入教学页（含 canvas 动画脚本 + 游戏 CSS）
  const { default: buildTeachingPage } = await import('../page/teach/index.js')

  root.value.innerHTML = buildTeachingPage()
  window.__rebindScriptEvents?.()

  // 教学页初始化 — 动画演示需要 DOM 就绪后手动触发
  setTimeout(() => {
    if (typeof window.updateDemo === 'function') {
      window.updateDemo()
    }
  }, 150)
})
</script>
