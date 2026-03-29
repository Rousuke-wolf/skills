// ./page/teach/index.js
import { buildNavbar } from "../../components/Navibar";
import './scripts.js';
import './index.css';
import './game/index.js'

export default function buildTeachingPage() {
  return `
    <div class="app-wrapper">
      ${buildNavbar ? buildNavbar('teaching') : '<div class="navbar-placeholder"></div>'}

      <div class="main-dashboard teaching-dashboard">

        <div class="left-stage">
          <div class="section-label">数字人引导区</div>
          <div class="character-section">
            <div class="character-3d">
              <canvas id="live2d" style="width:100%;height:100%;"></canvas>
            </div>
          </div>
          <div class="live2d-scene-info">
            <div class="scene-title">当前场景：<span>刺绣工坊环境</span></div>
            <div class="scene-desc">数字人后续可作为"绣娘引导员"，负责讲解针法、播放提示、引导步骤学习。</div>
          </div>
        </div>

        <div class="right-panel">

          <div class="section-label">动画演示区</div>
          <div class="demo-canvas-box">
            <div class="demo-visual" id="demoVisual">
              </div>
          </div>

          <div class="section-header" style="margin-top:20px; display: flex; align-items: center; justify-content: space-between;">
            <div class="section-label">步骤教学区</div>
            
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="glass-game-btn" onclick="openModal()">
                <span class="btn-icon">🎮</span>
              </button>
              <button id="playPauseBtn" class="demo-icon-btn" onclick="toggleStitchAnimation()">
                <span class="icon-pause"></span>
              </button>
            </div>
          </div>
          
          <div class="step-cards-row">
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
              <button class="pill-btn pill-active" data-stitch="flat"    onclick="selectPill(this); updateDemo()">平针</button>
              <button class="pill-btn"             data-stitch="back"    onclick="selectPill(this); updateDemo()">回针</button>
              <button class="pill-btn"             data-stitch="blanket" onclick="selectPill(this); updateDemo()">锁边针</button>
            </div>
            <div class="control-row">
              <span class="control-label">选择刺绣类型</span>
              <button class="pill-btn pill-active" data-type="su"   onclick="selectPill(this); updateDemo()">苏绣</button>
              <button class="pill-btn"             data-type="miao" onclick="selectPill(this); updateDemo()">苗绣</button>
            </div>
          </div>
          <div class="demo-info-bar">
            <span class="demo-title" id="demoTitle">平针 · 苏绣</span>
            <span class="demo-desc"  id="demoDesc">针头沿平行丝线细腻均匀地平稳推进，线迹紧密光洁，适合大面积渐变填充。</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
