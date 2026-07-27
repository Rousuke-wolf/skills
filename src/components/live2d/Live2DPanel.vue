<template>
  <div class="left-stage culture-left">
    <div class="character-section">
      <div class="character-3d">
        <canvas id="live2d" style="width:100%;height:100%;display:block;"></canvas>
      </div>
      <div class="emotion-switch">
        <button
          v-for="e in emotions"
          :key="e.key"
          class="emotion-btn"
          :class="{ active: current === e.key }"
          @click="set(e.key)"
        >
          {{ e.icon }} <span>{{ e.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emotions = [
  { key: 'happy', icon: '😊', label: '开心' },
  { key: 'peace', icon: '😌', label: '平静' },
  { key: 'thoughtful', icon: '🤔', label: '思考' },
  { key: 'surprised', icon: '😲', label: '惊讶' },
  { key: 'gentle', icon: '🥰', label: '温柔' },
]
const current = ref('happy')

function set(emotion) {
  current.value = emotion
  if (typeof window.setEmotion === 'function') {
    window.setEmotion(emotion)
  }
}

onMounted(() => {
  // 暴露给全局（script.js initLive2D 需要按钮 active 状态）
  window._live2dSetEmotion = set
  // 等待 script.js 的 initLive2D 初始化
  setTimeout(() => {
    if (typeof window.initLive2D_Public === 'function') {
      window.initLive2D_Public()
    }
  }, 100)
})
</script>
