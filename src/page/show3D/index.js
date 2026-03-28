import { MODELS } from '../../utils/models.js'
import { currentModelIndex, _modelHasContent } from '../../main.js'
import { buildNavbar } from '../../components/Navibar.js'
// ─────────────────────────────────────────────
// 3D展厅页（原非遗展示页，结构几乎不变）
// ─────────────────────────────────────────────
export function buildModelDropdown() {
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

export function build3DPage(hasModel = false) {
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
