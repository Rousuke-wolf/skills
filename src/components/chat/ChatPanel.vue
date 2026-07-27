<template>
  <div class="culture-chat-panel">
    <!-- 功能栏 -->
    <div class="function-bar">
      <div class="function-group">
        <div class="func-item" @click="toggleVoiceSettings" style="cursor:pointer;">
          <i>🔊</i> 语音设置
        </div>
      </div>
    </div>

    <!-- 语音设置 -->
    <div class="voice-settings-panel" id="voiceSettingsPanel" ref="voiceSettingsRef">
      <div class="vs-row">
        <span class="vs-label">🔉 音量</span>
        <input type="range" class="vs-slider" id="vsVolume" min="0" max="100" value="50" />
        <span class="vs-val" id="vsVolumeVal">50</span>
      </div>
      <div class="vs-row">
        <span class="vs-label">⏩ 语速</span>
        <input type="range" class="vs-slider" id="vsRate" min="0.5" max="2.0" step="0.1" value="1.2" />
        <span class="vs-val" id="vsRateVal">1.2x</span>
      </div>
    </div>

    <!-- 聊天历史 -->
    <div class="chat-history" id="chatHistory">
      <div class="welcome-banner">
        <div class="welcome-banner-left">
          <div class="welcome-avatar">绣</div>
          <div>
            <div class="welcome-name">绫韵</div>
            <div class="welcome-status"><span class="welcome-dot"></span>在线</div>
          </div>
        </div>
        <div class="welcome-body">
          👋 你好！我是刺绣文化讲解员绫韵~🧵<br>
          你可以向我提问关于刺绣历史、针法、四大名绣等任何问题，也可以点击下方卡片快速了解！
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <input type="text" placeholder="输入你想问的问题..." id="textInput" />
      <button id="sendBtn" title="发送消息">➤</button>
      <button id="ttsControlBtn" class="tts-control-btn" title="暂停语音">⏸</button>
      <button id="ttsStopBtn" class="tts-control-btn" title="停止语音">⏹</button>
      <button id="voiceChatBtn" class="voice-chat-btn" title="切换语音模式">🎤</button>
    </div>
  </div>
</template>

<script setup>
function toggleVoiceSettings() {
  const panel = document.getElementById('voiceSettingsPanel')
  if (panel) panel.classList.toggle('open')
}
</script>
