import './style.css'
import './script'
import { MODELS } from './models.js'

let currentModelIndex = 0
let currentPage = 'home'
let _modelHasContent = false
let _savedChatHTML = null

// ─────────────────────────────────────────────
// 公共：导航栏 — 参考图暖白色风格
// ─────────────────────────────────────────────
function buildNavbar(activePage) {
  const tabs = [
    { id: 'home',     label: '首页' },
    { id: 'culture',  label: '刺绣文化' },
    { id: 'teaching', label: '教学体验' },
    { id: '3d',       label: '3D展厅' },
    { id: 'about',    label: '关于我们' },
  ]
  const links = tabs.map(t => `
    <a class="nav-tab ${activePage === t.id ? 'active' : ''}"
       href="#" onclick="renderApp('${t.id}');return false;">${t.label}</a>
  `).join('')
  return `
    <div class="navbar">
      <div class="nav-logo">
        <div class="nav-logo-icon">绣</div>
        <span class="nav-logo-text">智传非遗</span>
      </div>
      <div class="nav-center">
        ${links}
      </div>
      <div class="nav-right">
        <button class="nav-cta-btn" onclick="renderApp('teaching');return false;">刺绣教学模式</button>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// 关于我们页
// ─────────────────────────────────────────────
function buildAboutPage() {
  return `
    <div class="app-wrapper page-about">
      ${buildNavbar('about')}
      <div class="about-page">
        <div class="about-hero">
          <div class="about-hero-inner">
            <div class="about-badge">🧵 关于我们</div>
            <h1 class="about-title">智传非遗</h1>
            <p class="about-subtitle">用数字技术守护千年绣艺，让非物质文化遗产在当代焕发生机</p>
          </div>
          <div class="about-deco-circle about-deco-1"></div>
          <div class="about-deco-circle about-deco-2"></div>
        </div>

        <div class="about-cards">
          <div class="about-card">
            <div class="about-card-icon">🎯</div>
            <div class="about-card-title">项目使命</div>
            <div class="about-card-text">以 AI 数字人为媒介，将中国传统刺绣的精湛技艺以生动、直观的方式呈现给大众，推动非物质文化遗产的数字化传承与创新发展。</div>
          </div>
          <div class="about-card">
            <div class="about-card-icon">🤖</div>
            <div class="about-card-title">核心技术</div>
            <div class="about-card-text">融合 Live2D 数字人、大语言模型 AI、语音合成 TTS、3D 模型展示等前沿技术，打造沉浸式非遗教学与体验平台。</div>
          </div>
          <div class="about-card">
            <div class="about-card-icon">🌏</div>
            <div class="about-card-title">文化价值</div>
            <div class="about-card-text">聚焦苗绣、苏绣等代表性刺绣流派，通过步骤教学、针法演示、文化讲解，让更多人了解并爱上中国刺绣之美。</div>
          </div>
        </div>

        <div class="about-team">
          <div class="about-section-title">项目团队</div>
          <div class="about-team-grid">
            <div class="about-member">
              <div class="about-member-avatar">🎨</div>
              <div class="about-member-name">UI / 交互设计</div>
              <div class="about-member-role">界面设计与用户体验</div>
            </div>
            <div class="about-member">
              <div class="about-member-avatar">💻</div>
              <div class="about-member-name">前端开发</div>
              <div class="about-member-role">Vite · Live2D · 3D展示</div>
            </div>
            <div class="about-member">
              <div class="about-member-avatar">🤖</div>
              <div class="about-member-name">AI 接入</div>
              <div class="about-member-role">大模型 · TTS 语音合成</div>
            </div>
            <div class="about-member">
              <div class="about-member-avatar">🧵</div>
              <div class="about-member-name">内容策划</div>
              <div class="about-member-role">非遗文化研究与内容撰写</div>
            </div>
          </div>
        </div>

        <div class="about-footer-note">
          本项目为非遗数字化传承课题研究成果 · 指导老师：待填写
        </div>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// 首页
// ─────────────────────────────────────────────
function buildHomePage() {
  return `
    <div class="app-wrapper page-home">
      ${buildNavbar('home')}
      <div class="hero-section">
        <div class="hero-bg-dots"></div>
        <div class="hero-content">
          <div class="hero-badge">🧵 非物质文化遗产 · 中国传统刺绣</div>
          <h1 class="hero-title">绣美<span class="hero-accent">中华</span></h1>
          <p class="hero-subtitle">以数字之光，传承千年绣艺<br>让苏绣、湘绣、蜀绣、粤绣在指尖重焕生机</p>
          <div class="hero-btns">
            <button class="btn-primary" onclick="renderApp('teaching')">开始体验</button>
            <button class="btn-outline" onclick="renderApp('culture')">了解刺绣文化</button>
          </div>
        </div>
      </div>
      <div class="home-features">
        <div class="home-feature-card" onclick="renderApp('teaching')">
          <div class="hf-icon">🎓</div>
          <div class="hf-title">教学体验</div>
          <div class="hf-desc">数字人引导员逐步讲解针法，动画演示全过程</div>
        </div>
        <div class="home-feature-card" onclick="renderApp('culture')">
          <div class="hf-icon">📖</div>
          <div class="hf-title">刺绣文化</div>
          <div class="hf-desc">深入了解四大名绣的历史渊源与艺术特色</div>
        </div>
        <div class="home-feature-card" onclick="renderApp('3d')">
          <div class="hf-icon">🏛️</div>
          <div class="hf-title">3D展厅</div>
          <div class="hf-desc">沉浸式浏览精美刺绣成品的三维模型</div>
        </div>
        <div class="home-feature-card" onclick="renderApp('teaching')">
          <div class="hf-icon">🤖</div>
          <div class="hf-title">AI 讲解员</div>
          <div class="hf-desc">智能数字人灵汐随时解答疑惑，支持语音交互</div>
        </div>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// 刺绣文化页
// ─────────────────────────────────────────────
function buildCulturePage() {
  return `
    <div class="app-wrapper page-culture">
      ${buildNavbar('culture')}
      <div class="culture-hero">
        <div class="culture-hero-text">
          <h1>刺绣文化</h1>
          <p>刺绣是中国最古老的传统手工艺之一，已有数千年历史。以针为笔、以线为墨，在丝绸或布料上绣出山川花鸟、人物故事。</p>
        </div>
        <div class="culture-hero-deco">🧵</div>
      </div>
      <div class="culture-grid">
        <div class="culture-item">
          <div class="culture-num">01</div>
          <div class="culture-item-title">苏绣 · 吴中绣艺</div>
          <div class="culture-item-text">苏州刺绣以精细雅洁著称，色彩清新，图案生动，素有"针尖上的芭蕾"之美誉。双面绣更是苏绣一绝。</div>
        </div>
        <div class="culture-item">
          <div class="culture-num">02</div>
          <div class="culture-item-title">湘绣 · 湖南绣法</div>
          <div class="culture-item-text">湘绣以狮虎为代表，用毛针法绣出毛茸茸的质感，色彩鲜艳浓烈，展现湖湘文化的豪放气质。</div>
        </div>
        <div class="culture-item">
          <div class="culture-num">03</div>
          <div class="culture-item-title">蜀绣 · 天府绣艺</div>
          <div class="culture-item-text">蜀绣源于古蜀，构图疏朗明快，线条流畅，具有浓郁地方特色和独特的艺术风格。</div>
        </div>
        <div class="culture-item">
          <div class="culture-num">04</div>
          <div class="culture-item-title">粤绣 · 岭南绣技</div>
          <div class="culture-item-text">粤绣涵盖广绣和潮绣，构图饱满均匀，色彩浓烈，富有南方热带风情。</div>
        </div>
        <div class="culture-item">
          <div class="culture-num">05</div>
          <div class="culture-item-title">传承与保护</div>
          <div class="culture-item-text">中国刺绣于2006年被列入首批国家级非物质文化遗产名录，各地相继建立传承中心。</div>
        </div>
        <div class="culture-item">
          <div class="culture-num">06</div>
          <div class="culture-item-title">现代创新</div>
          <div class="culture-item-text">当代绣娘将传统针法与现代审美融合，刺绣走进时装、家居、艺术装置领域焕发新生命。</div>
        </div>
      </div>
      <div class="stitch-section">
        <div class="section-title-row">
          <span class="section-label">针法大全</span>
          <span class="section-title-text">常见刺绣针法</span>
        </div>
        <div class="stitch-row">
          <div class="stitch-card stitch-active">
            <div class="stitch-emoji">🪡</div>
            <div class="stitch-name">平针</div>
            <div class="stitch-desc">最基础的针法，线迹平行排列，填充图案面积</div>
          </div>
          <div class="stitch-card">
            <div class="stitch-emoji">↩️</div>
            <div class="stitch-name">回针</div>
            <div class="stitch-desc">向后一针再向前两针，形成连续轮廓线迹</div>
          </div>
          <div class="stitch-card">
            <div class="stitch-emoji">🔗</div>
            <div class="stitch-name">锁边针</div>
            <div class="stitch-desc">沿边缘锁扣，装饰与加固布料边缘</div>
          </div>
          <div class="stitch-card">
            <div class="stitch-emoji">🌸</div>
            <div class="stitch-name">缎针</div>
            <div class="stitch-desc">长短缎针交错，绣出光滑如缎的填充效果</div>
          </div>
          <div class="stitch-card">
            <div class="stitch-emoji">🧶</div>
            <div class="stitch-name">结粒针</div>
            <div class="stitch-desc">在布面形成小颗粒结点，常用于绣花蕊</div>
          </div>
        </div>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// 教学体验页（原 AI 对话页 + 步骤/动画区）
// ─────────────────────────────────────────────
function buildTeachingPage() {
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

// ─────────────────────────────────────────────
// 3D展厅页（原非遗展示页，结构几乎不变）
// ─────────────────────────────────────────────
function buildModelDropdown() {
  const options = MODELS.map((m, i) => `
    <option value="${i}" ${(_modelHasContent && i === currentModelIndex) ? 'selected' : ''}>${m.name}</option>
  `).join('')
  return `
    <div class="model-dropdown-bar">
      <label class="model-dropdown-label">🏮 选择展品</label>
      <select class="model-dropdown" id="modelDropdown" onchange="onDropdownChange(this.value)">
        <option value="" selected disabled>请选择刺绣展品...</option>
        ${options}
      </select>
    </div>
  `
}

function build3DPage(hasModel = false) {
  const model = MODELS[currentModelIndex]
  return `
    <div class="app-wrapper">
      ${buildNavbar('3d')}
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
        <div class="right-panel model-right-panel" id="modelPanel">
          <div class="model-view-box model-view-box-top" id="modelViewBox">
            ${buildModelDropdown()}
            ${hasModel ? `
            <model-viewer
              id="mainModelViewer"
              src="${model.src}"
              alt="3D模型展示"
              auto-rotate
              camera-controls
              shadow-intensity="1"
              exposure="1"
              style="width:100%;height:100%;background:transparent;"
            ></model-viewer>
            ` : `
            <div class="model-empty-hint">
              <div class="hint-icon">🧵</div>
              <div class="hint-text">请从上方下拉框选择展品<br>或通过 AI 讲解员指定展品</div>
            </div>
            `}
          </div>
          <div class="model-info-card">
            <div class="model-info-header">
              <div class="model-info-title">展品介绍</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <button class="intro-audio-btn" id="playIntroBtn" title="播放语音讲解">🎤</button>
                <button class="model-back-voice-btn" onclick="renderApp('teaching')" title="返回教学讲解">💬 返回讲解</button>
              </div>
            </div>
            <div class="model-info-name" id="modelInfoName">${hasModel ? model.name : ''}</div>
            <div class="model-info-text" id="modelIntroText">${hasModel ? model.intro : '暂无展品，请通过上方下拉框或 AI 讲解员选择要展示的刺绣展品。'}</div>
            <div class="audio-status" id="audioStatus"></div>
          </div>
        </div>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────
// renderApp — 统一入口
// ─────────────────────────────────────────────
window.renderApp = function (page) {
  const existingChat = document.getElementById('chatHistory')
  if (existingChat) _savedChatHTML = existingChat.innerHTML

  currentPage = page
  const app = document.querySelector('#app')

  if (page === 'home')         app.innerHTML = buildHomePage()
  else if (page === 'culture') app.innerHTML = buildCulturePage()
  else if (page === 'teaching')app.innerHTML = buildTeachingPage()
  else if (page === '3d')      app.innerHTML = build3DPage(_modelHasContent)
  else if (page === 'about')   app.innerHTML = buildAboutPage()
  else                         app.innerHTML = buildHomePage()

  if (typeof window.__rebindScriptEvents === 'function') {
    window.__rebindScriptEvents()
  }

  if (page === 'teaching' && _savedChatHTML !== null) {
    const chatEl = document.getElementById('chatHistory')
    if (chatEl) { chatEl.innerHTML = _savedChatHTML; chatEl.scrollTop = chatEl.scrollHeight }
  }
}

// ─────────────────────────────────────────────
// 兼容旧 switchTab（script.js 里用到）
// ─────────────────────────────────────────────
window.switchTab = function (tab, modelIndex) {
  if (modelIndex !== undefined) {
    const idx = Number(modelIndex)
    currentModelIndex = (idx >= 0 && idx < MODELS.length) ? idx : 0
    _modelHasContent = true
  }
  window.renderApp(tab === 'ai' ? 'teaching' : '3d')
}

// ─────────────────────────────────────────────
// 3D 展品切换（同原版逻辑）
// ─────────────────────────────────────────────
window.onDropdownChange = function (value) {
  const idx = Number(value)
  if (isNaN(idx) || idx < 0 || idx >= MODELS.length) return
  currentModelIndex = idx
  _modelHasContent = true
  const viewer = document.getElementById('mainModelViewer')
  if (viewer) window.switchModel(idx)
  else window.renderApp('3d')
}

window.switchModel = function (index) {
  currentModelIndex = index
  const model = MODELS[index]
  const viewBox = document.getElementById('modelViewBox')
  if (viewBox && !document.getElementById('mainModelViewer')) {
    viewBox.innerHTML = `
      ${buildModelDropdown()}
      <model-viewer id="mainModelViewer" src="${model.src}" alt="3D模型展示"
        auto-rotate camera-controls shadow-intensity="1" exposure="1"
        style="width:100%;height:100%;background:transparent;"></model-viewer>`
  } else {
    const viewer = document.getElementById('mainModelViewer')
    if (viewer) viewer.setAttribute('src', model.src)
  }
  const nameEl = document.getElementById('modelInfoName')
  if (nameEl) nameEl.textContent = model.name
  const introEl = document.getElementById('modelIntroText')
  if (introEl) introEl.textContent = model.intro
  const statusEl = document.getElementById('audioStatus')
  if (statusEl) statusEl.textContent = ''
  const dropdown = document.getElementById('modelDropdown')
  if (dropdown) dropdown.value = String(index)
}

// ─────────────────────────────────────────────
// 教学页交互
// ─────────────────────────────────────────────
window.selectStep = function (el) {
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('step-active'))
  el.classList.add('step-active')
}

window.selectPill = function (el) {
  const row = el.closest('.control-row')
  if (row) row.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-active'))
  el.classList.add('pill-active')
}

// ─────────────────────────────────────────────
// 启动，默认首页
// ─────────────────────────────────────────────
window.renderApp('home')