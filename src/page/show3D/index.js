import { MODELS } from '../../utils/models.js'
import { currentModelIndex, _modelHasContent } from '../../main.js'
import { buildNavbar } from '../../components/Navibar.js'
import './index.css'
import './combo.css'
import './Meshy.js'

export function buildModelDropdown() {
  // datalist 选项：预设展品名称
  const datalistOptions = MODELS.map((m, i) =>
    `<option data-index="${i}" value="${m.name}"></option>`
  ).join('')

  const isProcessing = window.meshyTask?.status === 'processing'

  return `
    <div class="meshy-combo-bar">
      <!-- datalist 方案：输入框 + 原生下拉二合一 -->
      <div class="meshy-combo-row">
        <span class="meshy-combo-icon">🏮</span>
        <input
          type="text"
          id="meshyPrompt"
          class="meshy-combo-input"
          list="meshyPresetList"
          placeholder="选择预设展品 或 输入描述生成..."
          autocomplete="off"
          ${isProcessing ? 'disabled' : ''}
        />
        <datalist id="meshyPresetList">
          ${datalistOptions}
        </datalist>
        <button class="meshy-gen-btn" id="meshyGenBtn" onclick="window.meshyGenerate()">
          <span id="meshyBtnText">${isProcessing ? '⏳ 生成中...' : '🪄 生成'}</span>
        </button>
      </div>
      <!-- 预计时间 tag，生成中才显示 -->
      <div class="meshy-time-tag${isProcessing ? ' visible' : ''}" id="meshyTimeTag">
        ⏱ 预计 3 ~ 8 分钟
      </div>
    </div>
  `
}

export function build3DPage(hasModel = false) {
  const task = window.meshyTask
  const presetModel = MODELS[currentModelIndex]

  let currentSrc = ''
  let currentTitle = ''
  let currentIntro = '暂无展品，请选择或生成内容。'

  if (task.status === 'success') {
    currentSrc = task.resultUrl
    currentTitle = task.prompt
    currentIntro = '由 Meshy AI 根据您的描述生成的 3D 模型。'
  } else if (hasModel) {
    currentSrc = presetModel.src
    currentTitle = presetModel.name
    currentIntro = presetModel.intro
  }

  return `
    <div class="app-wrapper">
      ${buildNavbar('3d')}
      <div class="main-dashboard">
        <div class="left-stage">
          <div class="character-section">
            <div class="character-3d">
              <canvas id="live2d" style="width:45vw;"></canvas>
            </div>
          </div>
        </div>
        <div class="right-panel model-right-panel" id="modelPanel">
          <div class="model-view-box model-view-box-top" id="modelViewBox">
            ${buildModelDropdown()}
            <div class="model-viewer-wrap" id="modelViewerWrap">
              ${currentSrc ? `
                <model-viewer
                  id="mainModelViewer"
                  src="${currentSrc}"
                  auto-rotate
                  camera-controls
                  style="width:100%;height:100%;background:transparent;"
                ></model-viewer>
              ` : `
                <div class="model-empty-hint">
                  <div class="hint-icon">🧵</div>
                  <div class="hint-text">请选择展品或描述生成</div>
                </div>
              `}
            </div>
          </div>
          <div class="model-info-card">
            <div class="model-info-header">
              <div class="model-info-title">展品介绍</div>
            </div>
            <div class="model-info-name" id="modelInfoName">${currentTitle}</div>
            <div class="model-info-text" id="modelIntroText">${currentIntro}</div>
          </div>
        </div>
      </div>
    </div>
  `
}

// ── 绑定 datalist 选中预设展品的逻辑 ─────────────
window.__bindComboEvents = function () {
  const input = document.getElementById('meshyPrompt')
  if (!input) return

  input.addEventListener('change', () => {
    const val = input.value.trim()
    // 匹配预设展品名称
    const idx = MODELS.findIndex(m => m.name === val)
    if (idx !== -1 && typeof window.onDropdownChange === 'function') {
      window.onDropdownChange(idx)
    }
    // 不是预设名称则当作自定义描述，等用户点"生成"
  })
}
