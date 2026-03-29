// ─────────────────────────────────────────────
// 刺绣文化页  page/culture/index.js
// 布局：左侧 Live2D + 情绪 / 右上聊天 / 右下知识卡片（随机4张）
// ─────────────────────────────────────────────
import { buildNavbar } from "../../components/Navibar";
import './index.css';

// ── 知识卡片数据池（共 12 张，随机取 4）────────
const CULTURE_CARDS = [
  { emoji: '🧵', name: '苏绣',     tag: '精细雅洁 · 双面绣',     q: '请详细介绍苏绣的特点和代表作品' },
  { emoji: '🦁', name: '湘绣',     tag: '毛针质感 · 豪放气质',   q: '请详细介绍湘绣的特点和代表作品' },
  { emoji: '🐼', name: '蜀绣',     tag: '疏朗明快 · 天府风韵',   q: '请详细介绍蜀绣的特点和代表作品' },
  { emoji: '🦚', name: '粤绣',     tag: '饱满浓烈 · 岭南风情',   q: '请详细介绍粤绣的特点和代表作品' },
  { emoji: '🌺', name: '苗绣',     tag: '几何纹样 · 民族特色',   q: '请介绍苗绣的历史文化和特色纹样' },
  { emoji: '🪡', name: '平针',     tag: '最基础的刺绣针法',       q: '什么是平针？如何操作平针？' },
  { emoji: '↩️', name: '回针',     tag: '轮廓线条的常用针法',     q: '什么是回针？它有什么用途？' },
  { emoji: '🔗', name: '锁边针',   tag: '装饰与加固边缘',         q: '请介绍锁边针的特点和使用场景' },
  { emoji: '🌸', name: '缎针',     tag: '光滑填充 · 缎面效果',   q: '什么是缎针？如何绣出缎面质感？' },
  { emoji: '📜', name: '非遗历史', tag: '2006年列入国家名录',     q: '中国刺绣非遗的历史和保护现状是什么？' },
  { emoji: '🎨', name: '色彩搭配', tag: '刺绣配色艺术',           q: '传统刺绣的色彩搭配有哪些讲究？' },
  { emoji: '✂️', name: '绣布工具', tag: '绣绷 · 绣针 · 丝线',   q: '刺绣需要准备哪些基本工具和材料？' },
];

function pickRandom4() {
  const shuffled = [...CULTURE_CARDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

function buildCards(cards) {
  return cards.map((c, i) => `
    <div class="culture-mini-card" onclick="quickQuestion('${c.q}')">
      <div class="mini-card-num">0${i + 1}</div>
      <div class="mini-card-emoji">${c.emoji}</div>
      <div class="mini-card-name">${c.name}</div>
      <div class="mini-card-tag">${c.tag}</div>
    </div>
  `).join('')
}

export default function buildCulturePage() {
  const initCards = pickRandom4();

  return `
    <div class="app-wrapper page-culture">
      ${buildNavbar('culture')}

      <div class="main-dashboard culture-dashboard">

        <!-- ═══ 左侧：Live2D + 情绪切换 ═══ -->
        <div class="left-stage culture-left">
          <div class="character-section">
            <div class="character-3d">
              <canvas id="live2d" style="width:100%;height:100%;display:block;"></canvas>
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

        <!-- ═══ 右侧：聊天区 + 卡片区 ═══ -->
        <div class="right-panel culture-right">

          <!-- ── 右上：AI 聊天面板 ── -->
          <div class="culture-chat-panel">

            <div class="function-bar">
              <div class="function-group">
                <div class="func-item" onclick="toggleVoiceSettings()" style="cursor:pointer;">
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

            <div class="input-area">
              <input type="text" placeholder="输入你想问的问题..." id="textInput">
              <button id="sendBtn" title="发送消息">➤</button>
              <button id="ttsControlBtn" class="tts-control-btn" title="暂停语音">⏸</button>
              <button id="ttsStopBtn" class="tts-control-btn" title="停止语音">⏹</button>
              <button id="voiceChatBtn" class="voice-chat-btn" title="切换语音模式">🎤</button>
            </div>

          </div>

          <!-- ── 右下：随机知识卡片区 ── -->
          <div class="culture-cards-panel">
            <div class="culture-cards-header">
              <div class="culture-cards-title">🎴 刺绣知识卡片</div>
              <div class="culture-cards-refresh" onclick="refreshCultureCards()">🔀 换一批</div>
            </div>
            <div class="culture-mini-grid" id="cultureCardGrid">
              ${buildCards(initCards)}
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ═══ 语音模式浮层 ═══ -->
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

// ── 刷新卡片（全局，onclick 调用）─────────────
window.refreshCultureCards = function () {
  const grid = document.getElementById('cultureCardGrid');
  if (!grid) return;
  grid.style.opacity = '0';
  grid.style.transform = 'translateY(6px)';
  grid.style.transition = 'opacity 0.18s, transform 0.18s';
  setTimeout(() => {
    grid.innerHTML = buildCards(pickRandom4());
    grid.style.opacity = '1';
    grid.style.transform = 'translateY(0)';
    // 刷新后若仍处于锁定状态，重新禁用新卡片
    if (window._cultureInputLocked) {
      document.querySelectorAll('.culture-mini-card').forEach(c => {
        c.style.pointerEvents = 'none';
        c.style.opacity = '0.45';
      });
    }
  }, 180);
}