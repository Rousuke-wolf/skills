<template>
  <Teleport to="body">
    <div id="voiceModeUI" class="voice-mode-ui">
      <div class="voice-control-panel" id="voiceControlPanel">
        <div class="voice-status" id="voiceStatus">点击麦克风开始说话</div>
        <div class="voice-btn-group">
          <button class="voice-mic-btn" id="startVoice">🎙</button>
          <button class="voice-end-btn" id="stopVoice">✕</button>
        </div>
        <button class="voice-back-btn" id="backTextChat">⌨ 返回文字聊天</button>
      </div>
    </div>
  </Teleport>
</template>
