// Meshy.js — Meshy Text-to-3D API 集成 + AI 展品介绍 + TTS 播放
import { speak, pause, resume, stop } from '../../tts.js'

const MESHY_API_KEY = 'msy_9BOESjVcI8ETqeOnFM6U8wkFzUH6YCdyuL3G'
const MESHY_API_URL = '/meshy-api/openapi/v2/text-to-3d'
const MESHY_GLB_PROXY = '/meshy-glb'
const POLL_INTERVAL = 3000
const POLL_TIMEOUT = 300000

const QWEN_API_KEY = 'sk-bb2f9a5781d247568259cb014695d29a'
const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

window.meshyTask = window.meshyTask || { status: 'idle' }

// ── 状态提示 ──────────────────────────────────────
let _fadeTimer = null
function setStatus(msg, isError = false, autoFade = false) {
  const el = document.getElementById('meshyStatus')
  if (!el) return
  if (_fadeTimer) { clearTimeout(_fadeTimer); _fadeTimer = null }
  if (!msg) {
    el.style.transition = 'opacity 0.4s'; el.style.opacity = '0'
    setTimeout(() => { el.classList.remove('visible'); el.textContent = ''; el.style.opacity = '1' }, 400)
    return
  }
  el.style.transition = 'none'; el.style.opacity = '1'
  el.textContent = msg
  el.style.color = isError ? '#c0392b' : '#8a6030'
  el.classList.add('visible')
  if (autoFade) {
    _fadeTimer = setTimeout(() => {
      el.style.transition = 'opacity 0.8s ease'; el.style.opacity = '0'
      setTimeout(() => { el.classList.remove('visible'); el.textContent = ''; el.style.opacity = '1'; el.style.transition = 'none' }, 800)
    }, 2500)
  }
}

function setBtnLoading(loading) {
  const btn = document.getElementById('meshyGenBtn')
  const text = document.getElementById('meshyBtnText')
  const inp = document.getElementById('meshyPrompt')
  if (!btn || !text) return
  btn.disabled = loading
  if (inp) inp.disabled = loading
  text.textContent = loading ? '⏳ 生成中...' : '🪄 生成'
}

function setTimeTag(visible) {
  document.getElementById('meshyTimeTag')?.classList.toggle('visible', visible)
}

// ── TTS 状态机 ────────────────────────────────────
let _ttsState = 'idle' // idle | loading | playing | paused

function _setTtsBtnUI(state) {
  _ttsState = state
  const icon = document.getElementById('meshyTtsBtnIcon')
  const label = document.getElementById('meshyTtsBtnLabel')
  if (!icon || !label) return
  switch (state) {
    case 'loading':
      icon.textContent = '⏳'; label.textContent = ' 加载中...'; break
    case 'playing':
      icon.textContent = '⏸'; label.textContent = ' 暂停朗读'; break
    case 'paused':
      icon.textContent = '▶️'; label.textContent = ' 继续朗读'; break
    default:
      icon.textContent = '🔊'; label.textContent = ' 朗读介绍'
  }
}

function _enableTtsBtn() {
  const btn = document.getElementById('meshyTtsBtn')
  if (!btn) return
  btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'
}

function _disableTtsBtn() {
  const btn = document.getElementById('meshyTtsBtn')
  if (!btn) return
  btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'
  _setTtsBtnUI('idle')
}

// ── 切换模型时停止当前 TTS ────────────────────────
// 不管是预设切换还是生成新模型，只要介绍词要变，就停掉旧音频
function _stopTtsOnModelChange() {
  if (_ttsState !== 'idle') {
    stop()
    _setTtsBtnUI('idle')
  }
}

// ── 注入 TTS 按钮 ─────────────────────────────────
function injectTtsButton() {
  if (document.getElementById('meshyTtsBtn')) return
  const card = document.querySelector('.model-info-card')
  if (!card) return

  const btn = document.createElement('button')
  btn.id = 'meshyTtsBtn'
  btn.disabled = true
  btn.innerHTML = `<span id="meshyTtsBtnIcon">🔊</span><span id="meshyTtsBtnLabel"> 朗读介绍</span>`
  btn.style.cssText = `
    margin-top:14px;padding:7px 20px;border:none;border-radius:20px;
    background:#c8a96e;color:#fff;font-size:14px;font-weight:500;
    cursor:not-allowed;display:inline-flex;align-items:center;gap:4px;
    transition:background 0.2s,opacity 0.2s,transform 0.1s;opacity:0.4;
  `
  btn.addEventListener('mouseenter', () => { if (!btn.disabled) btn.style.background = '#b8934e' })
  btn.addEventListener('mouseleave', () => { if (!btn.disabled) btn.style.background = '#c8a96e' })
  btn.addEventListener('mousedown', () => { if (!btn.disabled) btn.style.transform = 'scale(0.96)' })
  btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1)' })
  btn.addEventListener('click', _handleTtsBtnClick)
  card.appendChild(btn)
}

function _handleTtsBtnClick() {
  if (_ttsState === 'loading') return

  if (_ttsState === 'playing') {
    pause()
    _setTtsBtnUI('paused')
    return
  }

  if (_ttsState === 'paused') {
    resume()
    _setTtsBtnUI('playing')
    return
  }

  // idle → 全新播放，读当前介绍词
  const introEl = document.getElementById('modelIntroText')
  const text = introEl?.textContent?.trim()
  if (!text || text === '✨ 正在生成展品介绍...') return

  _setTtsBtnUI('loading')

  speak(
    text,
    null,
    () => { _setTtsBtnUI('playing') },   // onStart
    () => { _setTtsBtnUI('idle') }        // onEnd
  )
}

// ── AI 展品介绍 ───────────────────────────────────
async function generateIntro(prompt) {
  try {
    const res = await fetch(QWEN_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${QWEN_API_KEY}` },
      body: JSON.stringify({
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: '你是一位非物质文化遗产讲解员，语言亲切、生动。根据用户提供的展品名称或描述，用100-150字介绍该展品的历史背景、工艺特点和文化价值。只输出介绍正文，不要标题，不要多余内容。' },
          { role: 'user', content: `请介绍这个展品：${prompt}` }
        ]
      })
    })
    if (!res.ok) throw new Error(`AI 请求失败 ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (e) {
    console.error('[Meshy] AI 介绍生成失败:', e)
    return null
  }
}

// ── 注入 model-viewer ─────────────────────────────
function loadGeneratedModel(glbUrl, label, intro) {
  // ✅ 切换模型时停止旧 TTS，防止继续播旧介绍词
  _stopTtsOnModelChange()

  const wrap = document.getElementById('modelViewerWrap') || document.getElementById('modelViewBox')
  if (!wrap) return

  wrap.querySelector('.model-empty-hint')?.remove()
  document.getElementById('mainModelViewer')?.remove()

  const viewer = document.createElement('model-viewer')
  viewer.id = 'mainModelViewer'
  viewer.setAttribute('src', glbUrl)
  viewer.setAttribute('auto-rotate', '')
  viewer.setAttribute('camera-controls', '')
  viewer.setAttribute('shadow-intensity', '1')
  viewer.setAttribute('exposure', '1')
  viewer.style.cssText = 'width:100%;height:100%;background:transparent;display:block;'
  wrap.appendChild(viewer)

  const nameEl = document.getElementById('modelInfoName')
  const introEl = document.getElementById('modelIntroText')
  if (nameEl) nameEl.textContent = label || 'AI 生成展品'
  if (introEl) introEl.textContent = intro || '✨ 正在生成展品介绍...'

  injectTtsButton()
  if (intro) _enableTtsBtn()
  else _disableTtsBtn()
}

// ── 预设模型切换时也要停止 TTS ────────────────────
// main.js 里的 onDropdownChange 切换预设模型后会重渲染页面
// 重渲染后 meshyRestoreState 会被调用，届时已经是新的介绍词
// 但如果切换时音频还在 paused，需要在这里提前 stop
window._meshyStopTts = function () {
  _stopTtsOnModelChange()
}

async function afterModelLoaded(glbUrl, prompt) {
  const intro = await generateIntro(prompt)
  const finalIntro = intro || '由 Meshy AI 根据您的描述生成的 3D 展品模型。'
  const introEl = document.getElementById('modelIntroText')
  if (introEl) introEl.textContent = finalIntro
  if (window._meshyResult) window._meshyResult.intro = finalIntro
  _enableTtsBtn()
}

function injectTtsForPreset() {
  const introEl = document.getElementById('modelIntroText')
  const text = introEl?.textContent?.trim()
  if (!text || text === '暂无展品，请选择或生成内容。') return
  injectTtsButton()
  _enableTtsBtn()
  _setTtsBtnUI('idle')
}

// ── 轮询 ─────────────────────────────────────────
async function pollTaskUntilDone(taskId) {
  const deadline = Date.now() + POLL_TIMEOUT
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL))
    const res = await fetch(`${MESHY_API_URL}/${taskId}`, {
      headers: { Authorization: `Bearer ${MESHY_API_KEY}` }
    })
    if (!res.ok) throw new Error(`轮询失败 ${res.status}`)
    const task = await res.json()
    if (task.status === 'SUCCEEDED') return task
    if (task.status === 'FAILED') throw new Error(task.task_error?.message || '生成失败')
    if (task.status === 'EXPIRED') throw new Error('任务超时')
  }
  throw new Error('等待超时，请重试')
}

// ── 主入口 ────────────────────────────────────────
window.meshyGenerate = async function () {
  const input = document.getElementById('meshyPrompt')
  const prompt = input?.value?.trim()
  if (!prompt) { setStatus('请先输入描述内容', true, true); return }

  stop(); _setTtsBtnUI('idle')
  setBtnLoading(true); setTimeTag(true)

  try {
    setStatus('🚀 正在提交生成任务...')

    const previewRes = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MESHY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'preview', prompt,
        art_style: 'realistic', negative_prompt: 'low quality, blurry',
        topology: 'quad', target_polycount: 30000, should_remesh: true
      })
    })
    if (!previewRes.ok) {
      const err = await previewRes.json().catch(() => ({}))
      throw new Error(err.message || `创建失败 ${previewRes.status}`)
    }
    const { result: previewTaskId } = await previewRes.json()
    window._meshyTask = { taskId: previewTaskId, prompt, startTime: Date.now() }
    window.meshyTask = { status: 'processing', prompt }

    setStatus('⚙️ 白模生成中...')
    const previewTask = await pollTaskUntilDone(previewTaskId)
    const previewGlb = previewTask.model_urls?.glb || previewTask.model_urls?.obj
    if (!previewGlb) throw new Error('未找到预览模型链接')

    loadGeneratedModel(`${MESHY_GLB_PROXY}?url=${encodeURIComponent(previewGlb)}`, prompt.slice(0, 20), null)

    setStatus('🎨 正在生成贴图...')
    const refineRes = await fetch(MESHY_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${MESHY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'refine', preview_task_id: previewTaskId, texture_resolution: 1024 })
    })
    if (!refineRes.ok) {
      const err = await refineRes.json().catch(() => ({}))
      throw new Error(err.message || `贴图创建失败 ${refineRes.status}`)
    }
    const { result: refineTaskId } = await refineRes.json()
    const refineTask = await pollTaskUntilDone(refineTaskId)
    const finalGlb = refineTask.model_urls?.glb || refineTask.model_urls?.obj
    if (!finalGlb) throw new Error('未找到最终模型链接')

    const finalUrl = `${MESHY_GLB_PROXY}?url=${encodeURIComponent(finalGlb)}`
    window._meshyResult = { glbUrl: finalUrl, prompt, intro: null }
    window._meshyTask = null
    window.meshyTask = { status: 'success', resultUrl: finalUrl, prompt }

    loadGeneratedModel(finalUrl, prompt.slice(0, 20), null)
    afterModelLoaded(finalUrl, prompt)

    setStatus('✅ 生成完成！', false, true)
    setBtnLoading(false); setTimeTag(false)

  } catch (e) {
    console.error('[Meshy]', e)
    setStatus(`❌ ${e.message}`, true, true)
    setBtnLoading(false); setTimeTag(false)
    window._meshyTask = null
    window.meshyTask = { status: 'idle' }
  }
}

// ── 恢复状态 ──────────────────────────────────────
function meshyRestoreState() {
  if (window._meshyResult) {
    const { glbUrl, prompt, intro } = window._meshyResult
    loadGeneratedModel(glbUrl, prompt.slice(0, 20), intro)
    if (!intro) afterModelLoaded(glbUrl, prompt)
    const inp = document.getElementById('meshyPrompt')
    if (inp) inp.value = prompt
    return
  }
  if (window._meshyTask) {
    const { prompt, startTime } = window._meshyTask
    if (Date.now() - startTime > POLL_TIMEOUT) {
      window._meshyTask = null; window.meshyTask = { status: 'idle' }; return
    }
    const inp = document.getElementById('meshyPrompt')
    if (inp) inp.value = prompt
    setBtnLoading(true); setTimeTag(true)
    setStatus('⚙️ 生成任务进行中...')
    return
  }
  injectTtsForPreset()
}

const _origRebind = window.__rebindScriptEvents
window.__rebindScriptEvents = function () {
  if (_origRebind) _origRebind()
  meshyRestoreState()
  if (typeof window.__bindComboEvents === 'function') window.__bindComboEvents()
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'meshyPrompt') window.meshyGenerate()
})

meshyRestoreState()
if (typeof window.__bindComboEvents === 'function') window.__bindComboEvents()
