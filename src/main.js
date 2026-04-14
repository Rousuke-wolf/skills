import './style.css'
import './script'
import { MODELS } from './utils/models.js'

window.meshyTask = {
  id: null,
  status: 'idle',    // idle(空闲), processing(生成中), success(成功), failed(失败)
  progress: 0,
  resultUrl: null,
  prompt: ""
};

// 页面构建函数
import buildHomePage from './page/home/index.js'
import buildCulturePage from './page/culture/index.js'
import buildTeachingPage from './page/teach/index.js'
import buildAboutPage from './page/about/index.js'
import { build3DPage, buildModelDropdown } from './page/show3D/index.js'



export let currentModelIndex = 0
let currentPage = 'home'
export let _modelHasContent = false
let _savedChatHTML = null

// ─────────────────────────────────────────────
// renderApp — 页面入口
// ─────────────────────────────────────────────

window.renderApp = function (page) {
  // ── 1. 离开文化页：保存聊天记录 ──────────────
  if (typeof window.saveCultureChat === 'function') {
    window.saveCultureChat()
  }

  // ── 2. 教学页聊天记录快照 ─────────────────────
  const existingChat = document.getElementById('chatHistory')
  if (existingChat) _savedChatHTML = existingChat.innerHTML

  // ── 3. 标记"正在切页"，阻止 rebind 时误触 TTS stop ──
  window._isSwitchingPage = true

  currentPage = page
  const app = document.querySelector('#app')

  if (page === 'home') app.innerHTML = buildHomePage()
  else if (page === 'culture') app.innerHTML = buildCulturePage()
  else if (page === 'teaching') app.innerHTML = buildTeachingPage()
  else if (page === '3d') app.innerHTML = build3DPage(_modelHasContent)
  else if (page === 'about') app.innerHTML = buildAboutPage()
  else app.innerHTML = buildHomePage()

  // 重新绑定通用事件（此时 _isSwitchingPage = true，stop 按钮不应触发 TTS stop）
  if (typeof window.__rebindScriptEvents === 'function') {
    window.__rebindScriptEvents()
  }

  // ── 4. 切页完成，解除标记 ─────────────────────
  window._isSwitchingPage = false

  // 教学页初始化
  if (page === 'teaching') {
    setTimeout(() => {
      if (typeof window.updateDemo === 'function') {
        window.updateDemo()
      }
    }, 100)
  }

  // 恢复聊天记录（教学页）
  if (page === 'teaching' && _savedChatHTML !== null) {
    const chatEl = document.getElementById('chatHistory')
    if (chatEl) {
      chatEl.innerHTML = _savedChatHTML
      chatEl.scrollTop = chatEl.scrollHeight
    }
  }
}

// ─────────────────────────────────────────────
// 兼容旧 switchTab
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
// 3D 展品切换
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
// 启动，默认首页
// ─────────────────────────────────────────────
window.renderApp('home')