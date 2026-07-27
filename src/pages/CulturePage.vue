<template>
  <div class="app-wrapper page-culture">
    <div ref="navbarRef"></div>

    <div class="main-dashboard culture-dashboard">
      <Live2DPanel />
      <div class="right-panel culture-right">
        <ChatPanel />
        <KnowledgeCards />
      </div>
    </div>

    <Lightbox />
    <VoiceOverlay />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import '../page/culture/index.css'
// 副作用导入：注册 window.saveCultureChat 供 renderApp 切页时调用
import '../page/culture/index.js'
import Live2DPanel from '../components/live2d/Live2DPanel.vue'
import ChatPanel from '../components/chat/ChatPanel.vue'
import KnowledgeCards from '../components/culture/KnowledgeCards.vue'
import Lightbox from '../components/ui/Lightbox.vue'
import VoiceOverlay from '../components/chat/VoiceOverlay.vue'
import { buildNavbar } from '../components/Navibar.js'

const navbarRef = ref(null)
let _savedChatHTML = null

// 恢复聊天记录
function restoreChat() {
  if (!_savedChatHTML) return
  const el = document.getElementById('chatHistory')
  if (el) {
    el.innerHTML = _savedChatHTML
    el.scrollTop = el.scrollHeight
  }
}

onMounted(() => {
  navbarRef.value.innerHTML = buildNavbar('culture')

  // 恢复之前的聊天记录
  restoreChat()

  // 触发 script.js 的 bindEvents + initLive2D
  window.__rebindScriptEvents?.()
})

onBeforeUnmount(() => {
  // 保存聊天记录（供切页后恢复）
  const el = document.getElementById('chatHistory')
  if (el) _savedChatHTML = el.innerHTML
  // 同时更新全局 saveCultureChat 用的缓存
  window._cultureChatHTML = _savedChatHTML
})
</script>
