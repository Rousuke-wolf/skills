import './style.css'
import './script'
import { MODELS } from './utils/models.js'                    

// 页面构建函数导入
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
  if (page === 'teaching') {
    setTimeout(() => {
      if (typeof window.updateDemo === 'function') window.updateDemo()
    }, 100)
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

let _stitchRAF = null;
let _stitchT = 0;

function _easeInOut(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

function _drawNeedle(ctx, x, y, angleDeg, isMiao) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleDeg * Math.PI / 180);
  const len = isMiao ? 38 : 26;
  const thick = isMiao ? 3.8 : 2.2;
  ctx.beginPath();
  ctx.strokeStyle = '#9a7d60';
  ctx.lineWidth = thick;
  ctx.lineCap = 'round';
  ctx.moveTo(0, -len * 0.3);
  ctx.lineTo(0, len * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = '#7a6050';
  ctx.lineWidth = 1;
  ctx.ellipse(0, -len * 0.18, thick * 0.8, thick * 1.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = '#cca880';
  ctx.arc(0, len * 0.7, thick * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = isMiao ? '#e84040' : '#c8a060';
  ctx.lineWidth = isMiao ? 2 : 1;
  ctx.setLineDash([4, 3]);
  ctx.moveTo(0, -len * 0.2);
  ctx.lineTo(0, -len * 1.6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function _drawFlat(ctx, W, H, t, isMiao) {
  ctx.clearRect(0, 0, W, H);
  const count = isMiao ? 3 : 6;
  const spacing = isMiao ? 36 : 20;
  const startY = H / 2 - (count - 1) * spacing / 2;
  const speed = isMiao ? 0.10 : 0.05;
  const dashLen = isMiao ? 28 : 10;
  const gapLen = isMiao ? 14 : 6;
  const colors = isMiao ? ['#d4433a', '#e8a020', '#3a7abf', '#7c3abf'] : ['#c8a878'];
  for (let i = 0; i < count; i++) {
    const y = startY + i * spacing;
    ctx.beginPath();
    ctx.setLineDash([dashLen, gapLen]);
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = isMiao ? 3.5 : 1.6;
    ctx.moveTo(50, y);
    ctx.lineTo(W - 50, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const rowIdx = Math.floor(t * speed * count) % count;
  const rowProg = (t * speed * count) % 1;
  const y = startY + rowIdx * spacing;
  const x = 50 + _easeInOut(rowProg) * (W - 100);
  _drawNeedle(ctx, x, y, isMiao ? -28 : -18, isMiao);
}

function _drawBack(ctx, W, H, t, isMiao) {
  ctx.clearRect(0, 0, W, H);
  const y = H / 2;
  const totalX = W - 120;
  const speed = isMiao ? 0.45 : 0.28;
  const cycle = (t * speed) % 1;
  ctx.beginPath();
  ctx.strokeStyle = isMiao ? '#6a3080' : '#b09060';
  ctx.lineWidth = isMiao ? 3 : 1.5;
  ctx.moveTo(60, y);
  ctx.lineTo(W - 60, y);
  ctx.stroke();
  let x, angleDeg;
  if (cycle < 0.55) {
    x = 60 + _easeInOut(cycle / 0.55) * totalX * (isMiao ? 0.7 : 0.65);
    angleDeg = isMiao ? -32 : -22;
  } else {
    const fwd = totalX * (isMiao ? 0.7 : 0.65);
    x = 60 + fwd - _easeInOut((cycle - 0.55) / 0.45) * totalX * (isMiao ? 0.4 : 0.22);
    angleDeg = isMiao ? 38 : 25;
  }
  ctx.setLineDash([isMiao ? 22 : 10, isMiao ? 5 : 3]);
  ctx.strokeStyle = isMiao ? '#b060c0' : '#d4b490';
  ctx.lineWidth = isMiao ? 2.5 : 1.2;
  ctx.beginPath();
  ctx.moveTo(60, y - 3);
  ctx.lineTo(x, y - 3);
  ctx.stroke();
  ctx.setLineDash([]);
  _drawNeedle(ctx, x, y, angleDeg, isMiao);
}

function _drawBlanket(ctx, W, H, t, isMiao) {
  ctx.clearRect(0, 0, W, H);
  const baseY = H * 0.70;
  const arcW = isMiao ? 68 : 42;
  const arcH = isMiao ? 90 : 55;
  const numArcs = isMiao ? 5 : 8;
  const speed = isMiao ? 0.2 : 0.1;
  const colors = isMiao ? ['#d4433a', '#e8a020', '#3a7abf', '#2a9a50', '#7c3abf'] : ['#c8a878'];
  const step = (W - 100) / numArcs;
  const current = t * speed * numArcs;
  ctx.beginPath();
  ctx.strokeStyle = isMiao ? '#7a3020' : '#b09060';
  ctx.lineWidth = isMiao ? 3 : 1.5;
  ctx.moveTo(50, baseY);
  ctx.lineTo(W - 50, baseY);
  ctx.stroke();
  for (let i = 0; i < numArcs; i++) {
    if (i < Math.floor(current % numArcs) || current >= numArcs) {
      const ax = 50 + i * step;
      ctx.beginPath();
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = isMiao ? 2.8 : 1.6;
      ctx.moveTo(ax, baseY);
      ctx.bezierCurveTo(ax + arcW * 0.3, baseY - arcH, ax + arcW * 0.7, baseY - arcH, ax + arcW, baseY);
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = isMiao ? '#803060' : '#a08050';
      ctx.lineWidth = isMiao ? 2 : 1;
      ctx.moveTo(ax, baseY);
      ctx.lineTo(ax, baseY - arcH * 0.28);
      ctx.stroke();
    }
  }
  const arcIdx = Math.floor(current) % numArcs;
  const arcProg = current % 1;
  const ax = 50 + arcIdx * step;
  const bx = p => { const m = 1 - p; return m * m * m * ax + 3 * m * m * p * (ax + arcW * 0.3) + 3 * m * p * p * (ax + arcW * 0.7) + p * p * p * (ax + arcW); };
  const by = p => { const m = 1 - p; return m * m * m * baseY + 3 * m * m * p * (baseY - arcH) + 3 * m * p * p * (baseY - arcH) + p * p * p * baseY; };
  const ep = _easeInOut(arcProg);
  const ep2 = Math.min(ep + 0.02, 1);
  const angle = Math.atan2(by(ep2) - by(ep), bx(ep2) - bx(ep)) * 180 / Math.PI - 90;
  _drawNeedle(ctx, bx(ep), by(ep), angle, isMiao);
}

window.updateDemo = function () {
  const stitchBtn = document.querySelector('.pill-btn.pill-active[data-stitch]');
  const typeBtn = document.querySelector('.pill-btn.pill-active[data-type]');
  const stitch = stitchBtn ? stitchBtn.dataset.stitch : 'flat';
  const type = typeBtn ? typeBtn.dataset.type : 'su';
  const isMiao = type === 'miao';

  const INFO = {
    flat: {
      su: { t: '平针 · 苏绣', d: '针头沿平行丝线细腻均匀地平稳推进，线迹紧密光洁，呈现丝绸般柔和光泽，适合大面积渐变填充。' },
      miao: { t: '平针 · 苗绣', d: '针头大幅横扫，步距粗犷有力，鲜艳色块铺陈开来，展现苗绣奔放的几何装饰美感。' }
    },
    back: {
      su: { t: '回针 · 苏绣', d: '针头轻退半步再细腻前进，节奏舒缓柔和，形成连续精密的轮廓线，精准描绘花草枝叶边缘。' },
      miao: { t: '回针 · 苗绣', d: '针头大幅后退再猛力前冲，节奏强烈有力，绣出粗壮鲜明的图腾轮廓线，充满张力。' }
    },
    blanket: {
      su: { t: '锁边针 · 苏绣', d: '针头绕小弧轻巧钩扣，动作精细秀气，锁扣细密均匀，线迹优雅，常用于丝绸绣品边缘装饰。' },
      miao: { t: '锁边针 · 苗绣', d: '针头大弧翻转钩扣，动作豪放奔腾，锁扣粗壮密实，牢固加固厚重布料与服饰边缘。' }
    },
  };

  const info = INFO[stitch][type];
  const titleEl = document.getElementById('demoTitle');
  const descEl = document.getElementById('demoDesc');
  if (titleEl) titleEl.textContent = info.t;
  if (descEl) descEl.textContent = info.d;

  const visualEl = document.getElementById('demoVisual');
  if (!visualEl) return;
  if (!document.getElementById('stitchCanvas')) {
    visualEl.innerHTML = '<canvas id="stitchCanvas" style="width:100%;height:100%;display:block;"></canvas>';
    // 注入后浏览器还没渲染，尺寸为 0，必须等下一帧再继续
    setTimeout(() => window.updateDemo(), 60);
    return;
  }

  if (_stitchRAF) cancelAnimationFrame(_stitchRAF);
  _stitchT = 0;

  const canvas = document.getElementById('stitchCanvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    setTimeout(() => window.updateDemo(), 60);
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const W = rect.width, H = rect.height;

  function loop() {
    _stitchT += 0.005;   // ← 速度，原来 0.012，现在慢了一倍多
    if (stitch === 'flat') _drawFlat(ctx, W, H, _stitchT, isMiao);
    else if (stitch === 'back') _drawBack(ctx, W, H, _stitchT, isMiao);
    else if (stitch === 'blanket') _drawBlanket(ctx, W, H, _stitchT, isMiao);
    _stitchRAF = requestAnimationFrame(loop);
  }
  loop();
};
// ─────────────────────────────────────────────
// 启动，默认首页
// ─────────────────────────────────────────────
window.renderApp('home')
