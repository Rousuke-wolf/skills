import { MODELS } from '../../utils/models.js'
import { currentModelIndex, _modelHasContent } from '../../main.js'
import { buildNavbar } from '../../components/Navibar.js'
import './index.css'
import './Meshy.js'

export function buildModelDropdown() {
  const options = MODELS.map((m, i) => `
    <option value="${i}" ${(_modelHasContent && i === currentModelIndex) ? 'selected' : ''}>${m.name}</option>
  `).join('')
  return `
    <div class="model-dropdown-bar">
      <label class="model-dropdown-label">🏮 选择展品</label>
      <select class="model-dropdown" id="modelDropdown" onchange="onDropdownChange(this.value)">
        <option value="" selected disabled>请选择文化展品...</option>
        ${options}
      </select>
    </div>
    <div class="meshy-gen-bar">
      <label class="model-dropdown-label">✨ 生成展品</label>
      <div class="meshy-input-row">
        <input type="text" id="meshyPrompt" class="meshy-input" placeholder="描述展品，如：青花瓷花瓶..." />
        <button class="meshy-gen-btn" id="meshyGenBtn" onclick="window.meshyGenerate()">
          <span id="meshyBtnText">${window.meshyTask.status === 'processing' ? '⏳ 生成中...' : '🪄 生成'}</span>
        </button>
      </div>
      <div class="meshy-status" id="meshyStatus"></div>
    </div>
  `
}

export function build3DPage(hasModel = false) {
  const task = window.meshyTask;
  const presetModel = MODELS[currentModelIndex];
  
  // 核心逻辑：确定当前显示的 SRC
  let currentSrc = "";
  let currentTitle = "";
  let currentIntro = "暂无展品，请选择或生成内容。";

  if (task.status === 'success') {
    currentSrc = task.resultUrl;
    currentTitle = task.prompt;
    currentIntro = "由 Meshy AI 根据您的描述生成的 3D 模型。";
  } else if (hasModel) {
    currentSrc = presetModel.src;
    currentTitle = presetModel.name;
    currentIntro = presetModel.intro;
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
            
            ${currentSrc ? `
            <model-viewer id="mainModelViewer" src="${currentSrc}" auto-rotate camera-controls style="width:100%;height:100%;background:transparent;"></model-viewer>
            ` : `
            <div class="model-empty-hint">
              <div class="hint-icon">🧵</div>
              <div class="hint-text">请选择展品或描述生成</div>
            </div>
            `}
          </div>

          <div class="model-info-card">
            <div class="model-info-header">
              <div class="model-info-title">展品介绍</div>
            </div>
            <div class="model-info-name" id="modelInfoName">${currentTitle}</div>
            <div class="model-info-text" id="modelIntroText">${currentIntro}</div>
            
            <div id="meshyStatus" class="meshy-status visible" style="margin-top:10px;">
               ${task.status === 'processing' ? `⚙️ 后台生成进度: ${task.progress}%` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}