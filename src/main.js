import './style.css'
import './script'
import { MODELS } from './utils/models.js'                    // ← 必须加上这一行（修复 currentModelIndex 相关报错的关键）

// 页面构建函数导入（你现有的）
import buildHomePage from './page/home/index.js'
import buildCulturePage from './page/culture/index.js'
import buildTeachingPage from './page/teach/index.js'
import buildAboutPage from './page/about/index.js'
import { build3DPage, buildModelDropdown } from './page/show3D/index.js'   // ← 必须同时导入 buildModelDropdown

export let currentModelIndex = 0
let currentPage = 'home'
export let _modelHasContent = false
let _savedChatHTML = null

// ─────────────────────────────────────────────
// renderApp — 统一入口
// ─────────────────────────────────────────────
window.renderApp = function (page) {
  const existingChat = document.getElementById('chatHistory')
  if (existingChat) _savedChatHTML = existingChat.innerHTML

  currentPage = page
  const app = document.querySelector('#app')

  if (page === 'home') app.innerHTML = buildHomePage()
  else if (page === 'culture') app.innerHTML = buildCulturePage()
  else if (page === 'teaching') app.innerHTML = buildTeachingPage()
  else if (page === '3d') app.innerHTML = build3DPage(_modelHasContent)
  else if (page === 'about') app.innerHTML = buildAboutPage()
  else app.innerHTML = buildHomePage()

  if (typeof window.__rebindScriptEvents === 'function') {
    window.__rebindScriptEvents()
  }

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
