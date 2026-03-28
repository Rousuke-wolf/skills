// ─────────────────────────────────────────────
// 教学体验页（原 AI 对话页 + 步骤/动画区）

import { buildNavbar } from "../../components/Navibar";

// ─────────────────────────────────────────────
export default function buildTeachingPage() {
  return `
    <div class="app-wrapper">
      ${buildNavbar('teaching')}
      <div class="main-dashboard">
        <div class="left-stage">
          <div class="character-section">
            <div class="character-3d">
              <canvas id="live2d" style="width:45vw;"></canvas>
            </div>
            <div class="emotion-switch">
              <button class="emotion-btn active" onclick="setEmotion('happy')">😊 <span>开心</span></button>
              <button class="emotion-btn" onclick="setEmotion('peace')">😌 <span>平静</span></button>
              <button class="emotion-btn" onclick="setEmotion('thoughtful')">🤔 <span>思考</span></button>
              <button class="emotion-btn" onclick="setEmotion('surprised')">😲 <span>惊讶</span></button>
              <button class="emotion-btn" onclick="setEmotion('gentle')">🥰 <span>温柔</span></button>
            </div>
          </div>
        </div>

        <div class="right-panel" id="aiPanel">
          <div class="function-bar">
            <div class="function-group">
              <div class="func-item" id="voiceSettingsBtn" onclick="toggleVoiceSettings()" style="cursor:pointer;">
                <i>🔊</i> 语音设置
              </div>
            </div>
          </div>
          <div class="voice-settings-panel" id="voiceSettingsPanel">
            <div class="vs-row">
              <span class="vs-label">🔉 音量</span>
              <input type="range" class="vs-slider" id="vsVolume" min="0" max="100" value="50"
                oninput="updateVoiceSetting('volume', this.value)">
              <span class="vs-val" id="vsVolumeVal">50</span>
            </div>
            <div class="vs-row">
              <span class="vs-label">⏩ 语速</span>
              <input type="range" class="vs-slider" id="vsRate" min="0.5" max="2.0" step="0.1" value="1.2"
                oninput="updateVoiceSetting('rate', this.value)">
              <span class="vs-val" id="vsRateVal">1.2x</span>
            </div>
          </div>

          <div class="anim-zone anim-zone-large">
            <div class="anim-placeholder">
              <div class="anim-icon">🎬</div>
              <div class="anim-title">动画演示区</div>
              <div class="anim-desc">这里后续放针法动画 / 视频 / 画布演示</div>
            </div>
          </div>

          <div class="steps-zone">
            <div class="steps-zone-title">步骤教学区</div>
            <div class="steps-row">
              <div class="step-card step-active" onclick="selectStep(this)">
                <div class="step-num">1</div>
                <div class="step-title">穿针引线</div>
                <div class="step-desc">当前步骤高亮显示，数字人同步讲解当前针法的准备动作与注意事项。</div>
              </div>
              <div class="step-card" onclick="selectStep(this)">
                <div class="step-num">2</div>
                <div class="step-title">起针定位</div>
                <div class="step-desc">根据绣布图案确定起针点，支持一步一步展示与点击切换教学内容。</div>
              </div>
              <div class="step-card" onclick="selectStep(this)">
                <div class="step-num">3</div>
                <div class="step-title">完成针法</div>
                <div class="step-desc">展示平针、回针、锁边针等不同技法的操作过程和文化说明。</div>
              </div>
            </div>
            <div class="stitch-controls">
              <div class="control-row">
                <span class="control-label">选择针法</span>
                <button class="pill-btn pill-active" onclick="selectPill(this)">平针</button>
                <button class="pill-btn" onclick="selectPill(this)">回针</button>
                <button class="pill-btn" onclick="selectPill(this)">锁边针</button>
              </div>
              <div class="control-row">
                <span class="control-label">选择刺绣类型</span>
                <button class="pill-btn pill-active" onclick="selectPill(this)">苗绣</button>
                <button class="pill-btn" onclick="selectPill(this)">苏绣</button>
              </div>
            </div>
          </div>

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
                👋 你好！我是刺绣数字人引导员绫韵~🪡<br>
                我可以为你讲解各种刺绣针法、历史文化，今天想从哪里开始？
              </div>
            </div>
          </div>
          <div class="input-area">
            <input type="text" placeholder="输入你想问的问题..." id="textInput">
            <button id="sendBtn" title="发送消息">➤</button>
            <button id="ttsControlBtn" class="tts-control-btn" title="暂停语音">⏸</button>
            <button id="ttsStopBtn" class="tts-control-btn" title="停止语音">⏹</button>
            <button id="voiceChatBtn" class="voice-chat-btn" title="切换语音模式">🎤</button>
          </div>
          <div class="suggest-grid">
            <div class="suggest-card" onclick="quickQuestion('什么是平针？如何操作？')">
              <div class="suggest-card-icon">🪡</div>
              <div class="suggest-card-title">平针介绍</div>
              <div class="suggest-card-desc">了解最基础的刺绣平针技法</div>
            </div>
            <div class="suggest-card" onclick="quickQuestion('苏绣和湘绣有什么区别？')">
              <div class="suggest-card-icon">🌸</div>
              <div class="suggest-card-title">四大名绣区别</div>
              <div class="suggest-card-desc">比较苏绣、湘绣、蜀绣、粤绣</div>
            </div>
            <div class="suggest-card" onclick="quickQuestion('刺绣初学者需要准备哪些工具？')">
              <div class="suggest-card-icon">🧰</div>
              <div class="suggest-card-title">初学者工具</div>
              <div class="suggest-card-desc">入门刺绣需要的基本材料</div>
            </div>
            <div class="suggest-card" onclick="quickQuestion('刺绣非遗的历史有多久？')">
              <div class="suggest-card-icon">📜</div>
              <div class="suggest-card-title">刺绣历史</div>
              <div class="suggest-card-desc">探索中国刺绣的千年历史渊源</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="voiceModeUI" class="voice-mode-ui">
      <div class="voice-control-panel">
        <div class="voice-status" id="voiceStatus">点击麦克风开始说话</div>
        <div class="voice-btn-group">
          <button class="voice-mic-btn" id="startVoice" title="开始/结束说话">🎙</button>
          <button class="voice-end-btn" id="stopVoice" title="结束对话">✕</button>
        </div>
        <button class="voice-back-btn" id="backTextChat">⌨ 返回文字聊天</button>
      </div>
    </div>
  `
}
