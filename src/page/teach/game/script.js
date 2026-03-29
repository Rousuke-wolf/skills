const ST = {
  flat: { name: '平针', color: '#c8923a', tol: 26, dash: [], clue: '横向平行，均匀连续' },
  back: { name: '回针', color: '#7ab4d4', tol: 20, dash: [8, 4], clue: '前进后退，线迹有缺口' },
  blanket: { name: '锁边针', color: '#8ecf6a', tol: 16, dash: [4, 4], clue: '锯齿折线，交替高低' },
};
const ST_KEYS = ['flat', 'back', 'blanket'];
const JIG_ANS = ['flat', 'back', 'blanket', 'back', 'flat', 'blanket', 'blanket', 'flat', 'back'];

// modal
function openModal() {
  const ov = document.getElementById('ov');
  ov.classList.add('open');
}
function closeModal() {
  const ov = document.getElementById('ov');
  ov.classList.remove('open');
}
function ovClick(e) { if (e.target === document.getElementById('ov')) closeModal(); }
function showScr(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById('s-' + id).classList.add('active'); }
function goBack() { stopTrace(); stopJig(); showScr('select'); }
function startGame(t) { if (t === 'trace') { showScr('trace'); initTrace(); } else { showScr('jig'); initJig(); } }

// ── TRACE ──────────────────────────────────────
let tRaf = null, tCtx = null, tW = 0, tH = 0;
let gPts = [], uPts = [], drawing = false;
let tRound = 0, tScoreSum = 0, tStitch = 'flat', tAnimOff = 0;

function pickStitch(btn) {
  document.querySelectorAll('.s-pill').forEach(b => b.classList.remove('on'));
  btn.classList.add('on'); tStitch = btn.dataset.s; initTrace();
}

function initTrace() {
  stopTrace();
  const cvs = document.getElementById('tCvs');
  requestAnimationFrame(() => {
    const r = cvs.getBoundingClientRect();
    cvs.width = Math.round(r.width) || 680; cvs.height = Math.round(r.height) || 260;
    tW = cvs.width; tH = cvs.height; tCtx = cvs.getContext('2d');
    gPts = buildGuide(tStitch, tW, tH);
    uPts = []; drawing = false; tRound = 0; tScoreSum = 0;
    document.getElementById('t-prog').style.width = '0%';
    document.getElementById('t-acc').textContent = '—';
    document.getElementById('t-hint').textContent = ST[tStitch].clue + '  — 按住沿金色线描绘';
    bindTrace(cvs);
    tRaf = requestAnimationFrame(traceLoop);
  });
}

function buildGuide(s, w, h) {
  const pts = [], mx = 55, mid = h / 2;
  if (s === 'flat') {
    for (let i = 0; i <= 60; i++) { const t = i / 60; pts.push([mx + t * (w - mx * 2), mid + Math.sin(t * Math.PI * 3.5) * 32]); }
  } else if (s === 'back') {
    const seg = (w - mx * 2) / 18; let x = mx; pts.push([x, mid]);
    for (let i = 0; i < 18; i++) {
      const y = mid + (i % 3 === 0 ? -26 : i % 3 === 1 ? 18 : -8);
      pts.push([x + seg * 3, y]); pts.push([x + seg * 2, y]); x += seg * 2;
    }
  } else {
    const step = (w - mx * 2) / 24;
    for (let i = 0; i <= 24; i++)pts.push([mx + i * step, mid + (i % 2 === 0 ? -30 : 30)]);
  }
  return pts;
}

function bindTrace(cvs) {
  cvs.onmousedown = cvs.onmousemove = cvs.onmouseup = cvs.onmouseleave = null;
  cvs.ontouchstart = cvs.ontouchmove = cvs.ontouchend = null;
  const pt = e => {
    const r = cvs.getBoundingClientRect();
    const sx = cvs.width / r.width, sy = cvs.height / r.height;
    return [((e.clientX ?? e.pageX) - r.left) * sx, ((e.clientY ?? e.pageY) - r.top) * sy];
  };
  cvs.onmousedown = e => { drawing = true; uPts = [pt(e)]; };
  cvs.onmousemove = e => { if (drawing) uPts.push(pt(e)); };
  cvs.onmouseup = () => { if (drawing) { drawing = false; scoreTrace(); } };
  cvs.onmouseleave = () => { if (drawing) { drawing = false; scoreTrace(); } };
  cvs.ontouchstart = e => { e.preventDefault(); drawing = true; uPts = [pt(e.touches[0])]; };
  cvs.ontouchmove = e => { e.preventDefault(); if (drawing) uPts.push(pt(e.touches[0])); };
  cvs.ontouchend = () => { drawing = false; scoreTrace(); };
}

function scoreTrace() {
  if (uPts.length < 8) return;
  const tol = ST[tStitch].tol;
  let covered = 0;
  for (const [gx, gy] of gPts) { for (const [ux, uy] of uPts) { if (Math.hypot(ux - gx, uy - gy) < tol * 1.5) { covered++; break; } } }
  let err = 0;
  for (const [ux, uy] of uPts) { let mn = Infinity; for (const [gx, gy] of gPts) { const d = Math.hypot(ux - gx, uy - gy); if (d < mn) mn = d; } err += mn; }
  const avgErr = err / uPts.length;
  const acc = Math.max(0, Math.min(100, Math.round((1 - avgErr / (tol * 4)) * 70 + (covered / gPts.length) * 30)));
  tScoreSum += acc; tRound++;
  document.getElementById('t-acc').textContent = Math.round(tScoreSum / tRound) + '%';
  document.getElementById('t-prog').style.width = Math.min(100, tRound * 20) + '%';
  document.getElementById('t-hint').textContent = acc >= 70 ? `很好！准确度 ${acc}%，继续下一条` : `偏移较多（${acc}%），尽量贴近金色引导线`;
  if (tRound >= 5) { setTimeout(() => finish('trace', Math.round(tScoreSum / tRound)), 300); return; }
  uPts = [];
}

function traceLoop(ts) { tAnimOff = ts / 1000; drawTrace(); tRaf = requestAnimationFrame(traceLoop); }
function stopTrace() { if (tRaf) { cancelAnimationFrame(tRaf); tRaf = null; } }

function drawTrace() {
  const cvs = document.getElementById('tCvs');
  if (!cvs || !tCtx || !tW) return;
  const ctx = tCtx;
  ctx.clearRect(0, 0, tW, tH);
  ctx.fillStyle = '#140c07'; ctx.fillRect(0, 0, tW, tH);
  ctx.strokeStyle = 'rgba(200,160,90,.04)'; ctx.lineWidth = 1;
  for (let y = 0; y < tH; y += 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(tW, y); ctx.stroke(); }
  for (let x = 0; x < tW; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tH); ctx.stroke(); }
  const s = ST[tStitch];
  // tol band
  ctx.strokeStyle = 'rgba(200,146,58,.1)'; ctx.lineWidth = s.tol * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
  ctx.beginPath(); gPts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke();
  // guide
  ctx.strokeStyle = 'rgba(200,146,58,.55)'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -tAnimOff * 18;
  ctx.beginPath(); gPts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < gPts.length; i += 4) { const [x, y] = gPts[i]; ctx.fillStyle = 'rgba(200,146,58,.55)'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
  // user
  if (uPts.length > 1) {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(s.dash);
    ctx.beginPath(); uPts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
    const [lx, ly] = uPts[uPts.length - 1];
    ctx.fillStyle = '#f0e0c8'; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
  }
}

// ── JIGSAW ─────────────────────────────────────
let jigState = [], jigSel = -1, cellAnims = [];

function initJig() {
  stopJig();
  cellAnims = []
  jigState = JIG_ANS.map(ans => ({ ans, chosen: null, done: false }));
  jigSel = -1
  document.getElementById('j-cnt').textContent = '0';
  document.getElementById('j-hint').textContent = '点击某个区块，观察其线迹动画，然后在下方选择针法';
  buildJigGrid(); buildJigOpts();
  jigState.forEach((_, i) => startCellAnim(i));
}

function stopJig() {
  cellAnims.forEach(id => cancelAnimationFrame(id));
  cellAnims = [];
  // stop opt preview rafes too (they self-manage, just orphan)
}

function buildJigGrid() {
  const g = document.getElementById('jigGrid'); g.innerHTML = '';
  jigState.forEach((_, i) => {
    const d = document.createElement('div'); d.className = 'jig-cell'; d.id = 'jc-' + i;
    const c = document.createElement('canvas'); c.id = 'jcc-' + i; d.appendChild(c);
    d.onclick = () => selectCell(i); g.appendChild(d);
  });
}

function buildJigOpts() {
  const o = document.getElementById('jigOpts'); o.innerHTML = '';
  ST_KEYS.forEach(sk => {
    const s = ST[sk];
    const d = document.createElement('div'); d.className = 'jig-opt'; d.id = 'jo-' + sk;
    const pw = document.createElement('div'); pw.className = 'opt-prev';
    const pc = document.createElement('canvas'); pc.id = 'opc-' + sk;
    pw.appendChild(pc); d.appendChild(pw);
    const nm = document.createElement('div'); nm.className = 'opt-name'; nm.textContent = s.name;
    const cl = document.createElement('div'); cl.className = 'opt-clue'; cl.textContent = s.clue;
    d.appendChild(nm); d.appendChild(cl);
    d.onclick = () => chooseStitch(sk);
    o.appendChild(d);
    startOptAnim(sk);
  });
}

function startOptAnim(sk) {
  let off = 0;
  const loop = () => {
    const cvs = document.getElementById('opc-' + sk); if (!cvs) return;
    const pw = cvs.parentElement; cvs.width = pw.clientWidth || 120; cvs.height = pw.clientHeight || 38;
    off += 0.025; drawOptPreview(cvs.getContext('2d'), cvs.width, cvs.height, sk, ST[sk].color, off);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function drawOptPreview(ctx, w, h, sk, color, off) {
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#1a1008'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const mid = h / 2;
  if (sk === 'flat') {
    for (let r = 0; r < 3; r++) { const y = h * .2 + r * h * .3; ctx.setLineDash([w, 0]); ctx.lineDashOffset = -off * w * (1 + r * .2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (sk === 'back') {
    ctx.setLineDash([10, 6]); ctx.lineDashOffset = -off * 40; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = .5;
    for (let x = 10; x < w; x += 18) { const ph = (x / w + off) % 1; ctx.globalAlpha = .3 + Math.sin(ph * Math.PI * 2) * .4; ctx.beginPath(); ctx.moveTo(x, mid - 8); ctx.lineTo(x, mid + 8); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else {
    ctx.setLineDash([]); ctx.beginPath();
    const step = 16, start = (off * step * 2) % (step * 2); let tg = 0;
    for (let x = -start; x <= w + step; x += step) { const y = mid + (tg ? -14 : 14); if (x === -start) ctx.moveTo(x, y); else ctx.lineTo(x, y); tg = 1 - tg; }
    ctx.stroke();
    const px = ((off * 2) % 1) * w, ptg = Math.floor(px / step) % 2, py = mid + (ptg ? -14 : 14);
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.setLineDash([]);
}

function startCellAnim(i) {
  const sk = jigState[i].ans, s = ST[sk];
  let off = Math.random() * 10;
  const loop = () => {
    const cell = jigState[i]; if (!cell) return;
    const cvs = document.getElementById('jcc-' + i); if (!cvs) return;
    const wrap = document.getElementById('jc-' + i); if (!wrap) return;
    cvs.width = wrap.clientWidth || 140; cvs.height = wrap.clientHeight || 90;
    off += cell.done ? 0 : .018;
    drawCellAnim(cvs.getContext('2d'), cvs.width, cvs.height, sk, s.color, off, cell.done, i === jigSel);
    const rafId = requestAnimationFrame(loop);
    cellAnims[i] = rafId;
  };
  requestAnimationFrame(loop);
}

function drawCellAnim(ctx, w, h, sk, color, off, done, selected) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = done ? '#0a1a0a' : selected ? '#221a08' : '#1a1008'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(200,160,90,.04)'; ctx.lineWidth = 1; ctx.setLineDash([]);
  for (let y = 0; y < h; y += 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const alpha = done ? .9 : .75;
  ctx.strokeStyle = color + (Math.round(alpha * 255).toString(16).padStart(2, '0'));
  ctx.lineWidth = done ? 2 : 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const mid = h / 2;
  if (sk === 'flat') {
    const rows = Math.floor(h / 10);
    for (let r = 0; r < rows; r++) { const y = 8 + r * 10, sp = 1 + r * .15; ctx.setLineDash([w, 0]); ctx.lineDashOffset = -off * w * sp; ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(w - 4, y); ctx.stroke(); }
  } else if (sk === 'back') {
    ctx.setLineDash([16, 8]); ctx.lineDashOffset = -off * 50;
    for (let r = 0; r < 3; r++) { const y = h * .2 + r * h * .3; ctx.beginPath(); ctx.moveTo(4, y); ctx.lineTo(w - 4, y); ctx.stroke(); }
    ctx.setLineDash([]);
    for (let x = 16; x < w - 4; x += 24) { const ph = ((x / w) * 3 + off) % 1; const y = h * .2 + Math.floor(ph * 3) * h * .3; ctx.globalAlpha = .45; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke(); ctx.globalAlpha = 1; }
  } else {
    ctx.setLineDash([]);
    for (let r = 0; r < 3; r++) {
      const baseY = h * .2 + r * h * .3, po = r * .33; ctx.beginPath();
      const step = 14, start = (off * step * 2 + po * step * 2) % (step * 2); let tg = 0;
      for (let x = -start; x <= w + step; x += step) { const y = baseY + (tg ? -11 : 11); if (x === -start) ctx.moveTo(x, y); else ctx.lineTo(x, y); tg = 1 - tg; }
      ctx.stroke();
    }
    const px = ((off * 55) % (w + 20)) - 10; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, mid, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.setLineDash([]);
  if (done) { ctx.fillStyle = 'rgba(80,200,80,.95)'; ctx.font = `bold ${Math.min(w, h) * .28}px Georgia`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', w / 2, h / 2); }
}

function selectCell(i) {
  if (jigState[i].done) return;
  jigSel = i;
  document.querySelectorAll('.jig-cell').forEach((el, idx) => el.classList.toggle('selected', idx === i));
  document.getElementById('j-hint').textContent = `区块 ${i + 1} 已选中 — 观察线迹特征后选择针法`;
}

function chooseStitch(sk) {
  if (jigSel < 0) { document.getElementById('j-hint').textContent = '请先点击一个区块再选择针法'; return; }
  const cell = jigState[jigSel]; if (cell.done) return;
  cell.chosen = sk;
  const el = document.getElementById('jc-' + jigSel);
  if (sk === cell.ans) {
    cell.done = true; el.classList.remove('selected', 'wrong'); el.classList.add('correct');
    document.querySelectorAll('.jig-cell').forEach(cellEl => cellEl.classList.remove('selected'));
    const cnt = jigState.filter(c => c.done).length;
    document.getElementById('j-cnt').textContent = cnt;
    document.getElementById('j-hint').textContent = `正确！这里是${ST[sk].name} ✓  继续识别其他区块`;
    jigSel = -1;
    if (cnt === 9) setTimeout(() => finish('jigsaw', 100), 400);
  } else {
    el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 350);
    document.getElementById('j-hint').textContent = `不对，再仔细看看 — ${ST[cell.ans].clue}`;
  }
}

// ── FINISH ─────────────────────────────────────
function finish(game, acc) {
  stopTrace(); stopJig(); showScr('done');
  const cvs = document.getElementById('doneCvs'); cvs.width = 340; cvs.height = 240;
  renderArtwork(cvs, game, acc);
  document.getElementById('done-txt').textContent = game === 'trace'
    ? `线迹准确度 ${acc}%，针法均匀流畅，呈现出苏绣的细腻光洁感。`
    : `全部针法识别正确，图案区块填充完整，色彩和谐，具有传统刺绣的层次感。`;
}

function renderArtwork(cvs, game, acc) {
  const ctx = cvs.getContext('2d'), w = cvs.width, h = cvs.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f4e8d2'; ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) { ctx.strokeStyle = `rgba(160,110,60,${y % 6 === 0 ? .06 : .03})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const cx = w / 2, cy = h / 2 - 8;
  const cols = ['#8b1a1a', '#c44a6a', '#1a5c2a', '#1a3a6b', '#6b3a1a', '#3a1a6b', '#5c1a1a', '#1a4a1a'];
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2 - Math.PI / 2, px = cx + Math.cos(a) * 50, py = cy + Math.sin(a) * 50;
    ctx.fillStyle = cols[p]; ctx.beginPath(); ctx.ellipse(px, py, 18, 9, a, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,170,.5)'; ctx.lineWidth = .8;
    for (let l = -3; l <= 3; l++) { const ox = Math.cos(a + Math.PI / 2) * l * 2.5, oy = Math.sin(a + Math.PI / 2) * l * 2.5; ctx.beginPath(); ctx.moveTo(px + ox - Math.cos(a) * 16, py + oy - Math.sin(a) * 16); ctx.lineTo(px + ox + Math.cos(a) * 16, py + oy + Math.sin(a) * 16); ctx.stroke(); }
  }
  ctx.fillStyle = '#c8923a'; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#f5d080'; ctx.lineWidth = 1.2;
  for (let a = 0; a < 10; a++) { const r = a / 10 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(r) * 5, cy + Math.sin(r) * 5); ctx.lineTo(cx + Math.cos(r) * 13, cy + Math.sin(r) * 13); ctx.stroke(); }
  ctx.strokeStyle = '#1a5c2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy + 65); ctx.quadraticCurveTo(cx - 10, cy + 95, cx, cy + 115); ctx.stroke();
  [[cx - 14, cy + 78, -.5], [cx + 12, cy + 95, .4]].forEach(([lx, ly, rot]) => { ctx.fillStyle = '#1a5c2a'; ctx.beginPath(); ctx.ellipse(lx, ly, 13, 6, rot, 0, Math.PI * 2); ctx.fill(); });
  if (game === 'trace') { const stars = Math.round(acc / 20); ctx.fillStyle = '#c8923a'; ctx.font = '13px Georgia'; ctx.textAlign = 'center'; ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), cx, h - 10); }
  ctx.strokeStyle = '#8a5e22'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.strokeStyle = 'rgba(200,146,58,.3)'; ctx.lineWidth = 1; ctx.strokeRect(7, 7, w - 14, h - 14);
}

window.openModal = openModal;
window.closeModal = closeModal;
window.startGame = startGame;
window.pickStitch = pickStitch;
window.goBack = goBack;
window.ovClick = ovClick;
