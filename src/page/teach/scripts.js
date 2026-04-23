// ./page/teach/scripts.js  v4
// 特性：canvas clip 防超框 · 3轮后重播 · 步骤圆点可点击 · 步骤卡片联动 + TTS 台词
//       切换针法/类型时自动停止上一次讲解 · 接入 3D GLB 数字人

// ── TTS 配置：两种方案二选一 ──────────────────────
// 方案 A（默认）：与文化页共用同一个 TTS 服务
//import { speak, stop } from '../../tts.js';

// 方案 B：教学页专用 TTS（独立语音模型/端点）
 import { teachSpeak as speak, teachStop as stop } from '../../tts-teach.js';
//  在 tts-teach.js 里配置 TTS_TEACH_PROXY 和 voice 参数即可
// ─────────────────────────────────────────────────

// ─── 全局动画状态 ─────────────────────────────
let _isAnimating  = true;
let _raf          = null;
let _T            = 0;           // 单调时间戳
const MAX_CYCLES  = 3;           // 演示几轮后重播

// ─── 当前选择（供外部 jumpToPhase 使用）────────
let _curStitch = 'flat';
let _curType   = 'su';
let _curSpeed  = 0.08;

// ─── 步骤指示条高度 ───────────────────────────
const SH = 66;

// ─────────────────────────────────────────────
//  数字人台词表  [stitch][type][stepCard 0~2]
//  stepCard: 0=穿针引线  1=起针定位  2=完成针法
// ─────────────────────────────────────────────
const SPEECH = {
  flat: {
    su: [
      '苏绣平针的第一步是穿针引线。选用细腻的蚕丝线，穿过针眼后留出约十厘米的线头，这样走针时线不容易滑脱。',
      '起针定位时，从绣布背面穿出针尖，找准图案的起始点。苏绣讲究线迹细密，起针位置要精准，每一针相距约一至二毫米。',
      '平针走到这里就完成了一个完整的针脚！正面留下均匀平行的长线段，背面是短弧。苏绣平针的精髓在于线迹紧密、光泽如绸，适合大面积的渐变填充。',
    ],
    miao: [
      '苗绣平针的穿针引线很有特色。苗族绣娘喜欢用棉线或蚕丝线，颜色鲜艳对比强烈，穿针后线头留长些，方便后续打结固定。',
      '苗绣起针定位与苏绣不同，针距更宽，约三到五毫米。从绣布背面穿出，找准几何图案的转折点，苗绣讲究对称与节奏感。',
      '苗绣平针完成！你看，大色块鲜艳的线段铺满正面，背面是较长的连接弧。苗族平针展现的是奔放热烈的几何装饰美感，与苏绣细腻风格形成鲜明对比！',
    ],
  },
  back: {
    su: [
      '苏绣回针的穿针引线需要更细的针和更柔的线。因为回针要反复穿越同一个孔，选用光滑的桑蚕丝线可以减少摩擦，保持线迹的光洁度。',
      '回针起针定位很关键——先向前跨两个针距取针，这是"进二"的步骤。苏绣回针起点通常选在图案轮廓上，确保最终形成连续流畅的线条。',
      '回针完成！每针向后插回前一个针孔，正面形成首尾相接的连续实线，背面是跨越两针距的大弧。苏绣回针常用于描绘花卉枝叶的精细轮廓，线迹连贯如画。',
    ],
    miao: [
      '苗绣回针使用较粗的棉线，穿针时稍微用力，保证线穿过厚实的苗族布料。苗族绣娘往往用鲜红和深蓝搭配，形成强烈的视觉冲击。',
      '苗绣回针起针步距更大，约五到八毫米跨进，体现苗绣粗犷有力的风格。起针要找准图腾纹样的轮廓线，让回针走出刚劲的边界感。',
      '苗绣回针大功告成！背面的弧比苏绣大得多，正面线段粗壮有力。苗族回针绣出的图腾轮廓，线条刚健、色彩浓烈，充满民族特色的张力！',
    ],
  },
  blanket: {
    su: [
      '苏绣锁边针的穿针要格外细心。选用略有弹性的丝线，从布料正面边缘垂直刺入，线头在背面打小结固定，这是锁边针的起手准备。',
      '锁边针起针定位时，针从正面刺入后，将线绕过布料边缘套住针尖，再向上轻轻拉出。苏绣讲究锁扣的均匀和紧密，每个锁扣间距约二毫米。',
      '苏绣锁边针完成！线圈收紧后在布料边缘形成精致的锁扣结，外观如同一排小辫子，既装饰美观又牢固耐用。这是苏绣绣品镶边最常用的针法之一。',
    ],
    miao: [
      '苗绣锁边针用线更粗，颜色更鲜艳。穿针时需要从布料边缘有力地刺入，苗族服饰面料较厚，需要稍大的针和较结实的棉线来完成锁边。',
      '苗绣锁边针起针时弧幅更大，绕线圈的动作也更豪放，弧高约是苏绣的一点五倍。每个锁扣间距约四到六毫米，形成醒目粗壮的边缘装饰。',
      '苗绣锁边针完成！大弧锁扣密实有力，边缘线条粗犷奔放。苗族服饰的领口、袖口、裙摆都用这种锁边针加固装饰，既实用又展现了苗族鲜明的审美个性！',
    ],
  },
};

// ─────────────────────────────────────────────
//  步骤指示条 文案（canvas 顶部 SH px）
// ─────────────────────────────────────────────
const STEPS = {
  flat: [
    { title: '正面行针', desc: '针沿布料正面平稳推进，留下均匀的长线段' },
    { title: '穿入背面', desc: '针尖向下刺入布料，带线穿向背面' },
    { title: '背面走弧', desc: '针在背面走一段短弧，与正面线段交替分布' },
    { title: '穿出正面', desc: '针从背面刺出，回到正面继续下一段行针' },
  ],
  back: [
    { title: '向前两步', desc: '针从正面穿出，跨越两个针距取针' },
    { title: '向后回针', desc: '针插回前一个针孔，正面形成连续实线' },
    { title: '背面跨越', desc: '针在背面跨越两针距向前穿行' },
    { title: '再次穿出', desc: '针从正面穿出，重复"退一进二"形成密实线迹' },
  ],
  blanket: [
    { title: '垂直下针', desc: '针从布料正面边缘垂直刺入，穿至背面' },
    { title: '绕线成圈', desc: '线绕过布料边缘，在正面展开大弧并套住针尖' },
    { title: '穿圈锁扣', desc: '针穿过线圈后上拉，在边缘形成锁扣结' },
    { title: '向前推进', desc: '收紧线圈，锁扣贴紧边缘，向下一位置推进' },
  ],
};

// 阶段时间边界
const PB = {
  flat:    [0, 0.28, 0.48, 0.74, 1.0],
  back:    [0, 0.25, 0.50, 0.75, 1.0],
  blanket: [0, 0.26, 0.54, 0.78, 1.0],
};

// 步骤卡片（3个）→ 对应动画阶段
const CARD_TO_PHASE = [0, 1, 3];   // 卡片0→phase0, 卡片1→phase1, 卡片2→phase3

// ─── 缓动 ─────────────────────────────────────
const ease    = x => x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2, 2)/2;
const bez     = (t,a,b,c,d) => { const m=1-t; return m*m*m*a+3*m*m*t*b+3*m*t*t*c+t*t*t*d; };
const bezPts  = (x0,y0,cx1,cy1,cx2,cy2,x1,y1,n=40) => {
  const p=[]; for(let i=0;i<=n;i++){const t=i/n;p.push({x:bez(t,x0,cx1,cx2,x1),y:bez(t,y0,cy1,cy2,y1)});} return p;
};

function getPhase(ct, bounds) {
  for(let i=0;i<bounds.length-1;i++){
    if(ct<=bounds[i+1]) return { phase:i, p:Math.min((ct-bounds[i])/(bounds[i+1]-bounds[i]),1) };
  }
  return { phase:bounds.length-2, p:1 };
}

// ─── 跳转到指定阶段 ───────────────────────────
window.jumpToPhase = function(phaseIdx) {
  const bounds = PB[_curStitch] || PB.flat;
  const target = bounds[Math.min(phaseIdx, bounds.length-2)] || 0;
  // 保持当前轮次，只改阶段内偏移
  const base = Math.floor(_T * _curSpeed);
  _T = (base + target) / _curSpeed;
};

// ─── 步骤卡片点击 ─────────────────────────────
window.stepCardClicked = function(cardIdx) {
  // 1. 停止上一次讲解
  stop();
  if (typeof window.stopLipsync === 'function') window.stopLipsync();

  // 2. 跳动画
  const phaseIdx = CARD_TO_PHASE[cardIdx] ?? cardIdx;
  window.jumpToPhase(phaseIdx);

  // 3. TTS 讲解 + 驱动 3D 模型口型/状态
  const lines = SPEECH[_curStitch]?.[_curType];
  if (lines && lines[cardIdx]) {
    const text = lines[cardIdx];
    // 估算播放时长：中文约 4 字/秒（语速 1.2x）
    const estimatedMs = (text.length / (4 * 1.2)) * 1000 + 500;
    if (typeof window.startLipsync === 'function') window.startLipsync();
    speak(text);
    // 播完后切回 idle
    setTimeout(() => {
      if (typeof window.stopLipsync === 'function') window.stopLipsync();
    }, estimatedMs);
  }
};

// ─────────────────────────────────────────────
//  步骤指示条（canvas 顶部，圆点可点击）
//  返回圆点坐标供点击检测
// ─────────────────────────────────────────────
const _dotPositions = [];   // [{cx, cy, r, phase}]

function drawHeader(ctx, W, stitch, phase, phP) {
  const steps = STEPS[stitch];

  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, W, SH);
  ctx.strokeStyle = 'rgba(180,148,100,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,SH); ctx.lineTo(W,SH); ctx.stroke();

  const n=steps.length, dotR=11, gap=50, sx=28, dy=20;
  _dotPositions.length = 0;  // 每帧更新坐标

  // 连线
  for(let i=0;i<n-1;i++){
    const x1=sx+i*gap+dotR+3, x2=sx+(i+1)*gap-dotR-3;
    ctx.strokeStyle = i<phase ? '#c8a060' : '#e2d6be';
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x1,dy); ctx.lineTo(x2,dy); ctx.stroke();
  }

  // 圆点
  for(let i=0;i<n;i++){
    const cx=sx+i*gap, isActive=i===phase, isDone=i<phase;
    _dotPositions.push({cx, cy:dy, r:dotR+6, phaseIdx:i});  // 扩大点击区域

    // 光晕
    if(isActive){
      ctx.beginPath(); ctx.arc(cx,dy,dotR+5,0,Math.PI*2);
      ctx.fillStyle='rgba(192,144,60,0.14)'; ctx.fill();
    }
    // 背景
    ctx.beginPath(); ctx.arc(cx,dy,dotR,0,Math.PI*2);
    if(isActive){
      const g=ctx.createRadialGradient(cx-2,dy-2,1,cx,dy,dotR);
      g.addColorStop(0,'#e8b050'); g.addColorStop(1,'#9c7028');
      ctx.fillStyle=g;
    } else if(isDone){ ctx.fillStyle='#c8a878'; }
    else { ctx.fillStyle='#ece3cf'; }
    ctx.fill();
    // 数字
    ctx.font=`bold ${isActive?12:10}px sans-serif`;
    ctx.fillStyle=isActive||isDone?'#fff':'#b09870';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(i+1),cx,dy);

    // "可点击"提示（hover 效果用 cursor: pointer CSS 实现）
    if(!isActive){
      ctx.beginPath(); ctx.arc(cx,dy,dotR,0,Math.PI*2);
      ctx.strokeStyle='rgba(160,120,60,0.25)'; ctx.lineWidth=1.5; ctx.stroke();
    }
  }

  // 当前步骤说明
  const cur=steps[phase], tx=sx+(n-1)*gap+dotR+18;
  ctx.textAlign='left';
  ctx.font=`bold 13px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle='#6b3e18'; ctx.textBaseline='top';
  ctx.fillText(`${phase+1}. ${cur.title}`, tx, 6);
  ctx.font=`11.5px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle='#a08060';
  ctx.fillText(cur.desc, tx, 24);

  // 进度条
  const bx=tx, bw=Math.min(W-tx-16, 240), by=SH-12;
  ctx.fillStyle='#ece3cf'; ctx.beginPath(); _rr(ctx,bx,by,bw,5,3); ctx.fill();
  ctx.fillStyle='#c8a060'; ctx.beginPath(); _rr(ctx,bx,by,Math.max(0,bw*ease(phP)),5,3); ctx.fill();
}

function _rr(ctx,x,y,w,h,r){
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+w,y,r);
}

// ─────────────────────────────────────────────
//  布料背景
// ─────────────────────────────────────────────
function drawFabric(ctx, W, fy, top, animH) {
  ctx.fillStyle='#fdfaf3'; ctx.fillRect(0,top,W,fy-top);
  ctx.fillStyle='#f4ead8'; ctx.fillRect(0,fy,W,top+animH-fy);

  ctx.save(); ctx.strokeStyle='rgba(160,130,80,0.055)'; ctx.lineWidth=0.7;
  for(let x=-animH*2;x<W+animH;x+=8){
    ctx.beginPath(); ctx.moveTo(x,fy); ctx.lineTo(x+animH,fy+animH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,fy); ctx.lineTo(x-animH*.6,fy-animH*.6); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.shadowColor='rgba(60,30,10,0.22)'; ctx.shadowBlur=5; ctx.shadowOffsetY=2;
  ctx.strokeStyle='#1e1208'; ctx.lineWidth=4.5; ctx.lineCap='butt';
  ctx.beginPath(); ctx.moveTo(18,fy); ctx.lineTo(W-18,fy); ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font='bold 12px "Noto Serif SC","SimSun",serif';
  ctx.fillStyle='#5c3d1e'; ctx.textBaseline='bottom';
  ctx.fillText('正面',26,fy-9);
  ctx.strokeStyle='rgba(120,80,40,0.14)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(26,fy-7); ctx.lineTo(W-26,fy-7); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  ctx.save();
  ctx.font='bold 12px "Noto Serif SC","SimSun",serif';
  ctx.fillStyle='#9a7050'; ctx.textBaseline='top';
  ctx.fillText('背面',26,fy+9);
  ctx.strokeStyle='rgba(120,80,40,0.10)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(26,fy+7); ctx.lineTo(W-26,fy+7); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
}

// ─────────────────────────────────────────────
//  针
// ─────────────────────────────────────────────
function drawNeedle(ctx, tx, ty, ang, sz=1) {
  ctx.save();
  ctx.translate(tx,ty); ctx.rotate(ang*Math.PI/180);
  const L=44*sz, bW=3.2*sz;
  const g=ctx.createLinearGradient(-bW,0,bW,0);
  g.addColorStop(0,'#b0a078'); g.addColorStop(0.35,'#ece8c0');
  g.addColorStop(0.65,'#d4c088'); g.addColorStop(1,'#88703c');
  ctx.shadowColor='rgba(50,25,5,0.25)'; ctx.shadowBlur=6;
  ctx.shadowOffsetX=2; ctx.shadowOffsetY=3;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(bW*.5,L*.1,bW,L*.28,bW,L*.55);
  ctx.bezierCurveTo(bW,L*.80,bW*.82,L*.92,0,L);
  ctx.bezierCurveTo(-bW*.82,L*.92,-bW,L*.80,-bW,L*.55);
  ctx.bezierCurveTo(-bW,L*.28,-bW*.5,L*.1,0,0);
  ctx.closePath(); ctx.fillStyle=g; ctx.fill(); ctx.shadowColor='transparent';
  ctx.fillStyle='rgba(60,38,12,0.50)';
  ctx.beginPath(); ctx.ellipse(0,L*.82,bW*.38,bW*.72,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,245,210,0.28)';
  ctx.beginPath(); ctx.ellipse(0,L*.82,bW*.18,bW*.34,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,252,220,0.52)'; ctx.lineWidth=0.9;
  ctx.beginPath(); ctx.moveTo(-bW*.18,L*.14);
  ctx.bezierCurveTo(-bW*.28,L*.38,-bW*.32,L*.60,-bW*.22,L*.78); ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────
//  穿孔标记
// ─────────────────────────────────────────────
function drawMarker(ctx, x, y, num, active) {
  const r=7;
  ctx.beginPath(); ctx.arc(x,y,r+2,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=active?'#c0392b':'rgba(150,112,55,0.5)';
  ctx.lineWidth=active?2:1.5; ctx.stroke();
  ctx.font='bold 8px sans-serif'; ctx.fillStyle=active?'#c0392b':'#a08048';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(num),x,y);
  ctx.font='bold 11px "Noto Sans SC",sans-serif';
  ctx.fillStyle=active?'#c0392b':'#b09060'; ctx.textBaseline='bottom';
  ctx.fillText(String(num),x,y-r-3);
}

// ─────────────────────────────────────────────
//  渐进绘制折线
// ─────────────────────────────────────────────
function strokePts(ctx, pts, prog, color, lw, dash) {
  if(!pts||pts.length<2||prog<=0) return;
  let tot=0; const segs=[];
  for(let i=0;i<pts.length-1;i++){
    const d=Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y);
    segs.push(d); tot+=d;
  }
  let rem=tot*Math.min(prog,1);
  ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=lw;
  ctx.lineCap='round'; ctx.lineJoin='round';
  if(dash) ctx.setLineDash([9,5]);
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=0;i<segs.length;i++){
    if(rem<=0) break;
    if(rem>=segs[i]){ ctx.lineTo(pts[i+1].x,pts[i+1].y); rem-=segs[i]; }
    else{ const f=rem/segs[i]; ctx.lineTo(pts[i].x+(pts[i+1].x-pts[i].x)*f,pts[i].y+(pts[i+1].y-pts[i].y)*f); rem=0; }
  }
  ctx.stroke(); if(dash) ctx.setLineDash([]); ctx.restore();
}

// ─────────────────────────────────────────────
//  平针
// ─────────────────────────────────────────────
function drawFlat(ctx, W, H, ct, nDone, isMiao) {
  const top=SH, aH=H-SH, fy=top+aH*0.40;
  drawFabric(ctx,W,fy,top,aH);
  const mg=70, span=W-mg*2, nV=isMiao?3:4;
  const unit=span/nV, fw=unit*0.62, bw=unit-fw;
  const fY=fy-32, bPk=fy+32;
  const col=isMiao?'#d4433a':'#c0392b', lw=isMiao?3.8:3.2;
  const fade=isMiao?'rgba(212,67,58,0.20)':'rgba(192,57,43,0.18)';

  const hist=Math.min(nDone,nV-1);
  for(let i=0;i<hist;i++){
    const x0=mg+i*unit;
    strokePts(ctx,[{x:x0,y:fY},{x:x0+fw,y:fY}],1,fade,lw);
    strokePts(ctx,bezPts(x0+fw,bPk,x0+fw+bw*.4,bPk+10,x0+unit-bw*.4,bPk+10,x0+unit,bPk),1,fade,lw*.8,true);
    drawMarker(ctx,x0,fy,i*2+1,false); drawMarker(ctx,x0+fw,fy,i*2+2,false);
  }
  const ci=hist, x0=mg+ci*unit;
  const {phase,p}=getPhase(ct,PB.flat);
  if(phase>=0){ strokePts(ctx,[{x:x0,y:fY},{x:x0+fw*ease(phase===0?p:1),y:fY}],1,col,lw); }
  drawMarker(ctx,x0,fy,ci*2+1,phase===0);
  if(phase>=1){ const pr=ease(phase===1?p:1); drawNeedle(ctx,x0+fw,fy-30+(fy+aH*.35-(fy-30))*pr,88,isMiao?1.1:1); drawMarker(ctx,x0+fw,fy,ci*2+2,phase===1); }
  if(phase>=2){ strokePts(ctx,bezPts(x0+fw,bPk,x0+fw+bw*.4,bPk+10,x0+unit-bw*.4,bPk+10,x0+unit,bPk),ease(phase===2?p:1),col,lw*.85,true); }
  if(phase>=3){ const pr=ease(phase===3?p:1); drawNeedle(ctx,x0+unit,fy+aH*.40+(fy-30-(fy+aH*.40))*pr,-90,isMiao?1.1:1); drawMarker(ctx,x0+unit,fy,ci*2+3,phase===3); }
}

// ─────────────────────────────────────────────
//  回针
// ─────────────────────────────────────────────
function drawBack(ctx, W, H, ct, nDone, isMiao) {
  const top=SH, aH=H-SH, fy=top+aH*0.40;
  drawFabric(ctx,W,fy,top,aH);
  const mg=65, span=W-mg*2, nV=isMiao?3:4;
  const step=span/(nV+1), fY=fy-32, bPk=fy+(isMiao?46:38);
  const col=isMiao?'#7c3abf':'#c0392b', lw=isMiao?3.8:3.2;
  const fade=isMiao?'rgba(124,58,191,0.20)':'rgba(192,57,43,0.18)';
  const startX=mg+step;
  const hist=Math.min(nDone,nV);
  if(hist>0){ strokePts(ctx,[{x:startX,y:fY},{x:startX+hist*step,y:fY}],1,fade,lw); }
  for(let i=0;i<hist;i++){
    const ax=startX+i*step, bx=ax+step*2;
    strokePts(ctx,bezPts(ax,bPk,ax+(bx-ax)*.35,bPk+(isMiao?30:22),bx-(bx-ax)*.35,bPk+(isMiao?30:22),bx,bPk),1,fade,lw*.85,true);
    drawMarker(ctx,ax,fy,i*2+1,false); drawMarker(ctx,bx,fy,i*2+2,false);
  }
  const ci=hist, ax=startX+ci*step, bx=ax+step*2, midX=ax+step;
  const {phase,p}=getPhase(ct,PB.back);
  if(phase>=0){ strokePts(ctx,[{x:ax,y:fY},{x:ax+(bx-ax)*ease(phase===0?p:1),y:fY}],1,col,lw); drawMarker(ctx,ax,fy,ci*2+1,phase===0); }
  if(phase>=1){ const pr=ease(phase===1?p:1); strokePts(ctx,[{x:bx,y:fY},{x:bx-(bx-midX)*pr,y:fY}],1,col,lw); if(phase===1){drawNeedle(ctx,bx,fy-30+(fy+20)*ease(p)*.7,88,isMiao?1.1:1);} drawMarker(ctx,bx,fy,ci*2+2,phase<=1); }
  if(phase>=2){ const nX=bx+step; strokePts(ctx,bezPts(midX,bPk,midX+(nX-midX)*.35,bPk+(isMiao?32:24),nX-(nX-midX)*.35,bPk+(isMiao?32:24),nX,bPk),ease(phase===2?p:1),col,lw*.85,true); drawMarker(ctx,midX,fy,ci*2+2,phase===2); }
  if(phase>=3){ const nX=bx+step; const pr=ease(phase===3?p:1); drawNeedle(ctx,nX,fy+aH*.40+(fy-30-(fy+aH*.40))*pr,-90,isMiao?1.1:1); drawMarker(ctx,nX,fy,ci*2+3,phase===3); }
}

// ─────────────────────────────────────────────
//  锁边针
// ─────────────────────────────────────────────
function drawBlanket(ctx, W, H, ct, nDone, isMiao) {
  const top=SH, aH=H-SH, fy=top+aH*0.45;
  drawFabric(ctx,W,fy,top,aH);
  const mg=65, span=W-mg*2, nV=isMiao?3:4;
  const unit=span/nV, arcTop=fy-(isMiao?72:58), bY=fy+(isMiao?26:20), baseY=fy+5;
  const col=isMiao?'#d4433a':'#c0392b', lw=isMiao?3.8:3.2;
  const fade=isMiao?'rgba(212,67,58,0.20)':'rgba(192,57,43,0.18)';

  ctx.save(); ctx.strokeStyle=col; ctx.globalAlpha=0.30; ctx.lineWidth=lw*.7;
  ctx.beginPath(); ctx.moveTo(mg,baseY); ctx.lineTo(W-mg,baseY); ctx.stroke();
  ctx.globalAlpha=1; ctx.restore();

  const hist=Math.min(nDone,nV-1);
  for(let i=0;i<hist;i++){
    const ax=mg+i*unit, ax2=ax+unit;
    strokePts(ctx,bezPts(ax,baseY,ax+unit*.2,arcTop,ax+unit*.8,arcTop,ax2,baseY),1,fade,lw);
    strokePts(ctx,[{x:ax,y:baseY},{x:ax,y:bY}],1,fade,lw*.8);
    drawMarker(ctx,ax,fy,i+1,false);
  }
  const ci=hist, ax=mg+ci*unit, ax2=ax+unit;
  const {phase,p}=getPhase(ct,PB.blanket);
  if(phase>=0){ const pr=ease(phase===0?p:1); strokePts(ctx,[{x:ax,y:baseY},{x:ax,y:baseY+(bY-baseY)*pr}],1,col,lw*.85); if(phase===0){drawNeedle(ctx,ax,fy-36+(baseY-(fy-36))*ease(p),90,isMiao?1.1:1);} drawMarker(ctx,ax,fy,ci+1,phase===0); }
  if(phase>=1){ const pr=ease(phase===1?p:1); strokePts(ctx,bezPts(ax,baseY,ax+unit*.2,arcTop,ax+unit*.8,arcTop,ax2,baseY),pr,col,lw); if(phase===1){ const t=ease(p); const nx=bez(t,ax,ax+unit*.2,ax+unit*.8,ax2),ny=bez(t,baseY,arcTop,arcTop,baseY); const t2=Math.min(t+.02,1); const ang=Math.atan2(bez(t2,baseY,arcTop,arcTop,baseY)-ny,bez(t2,ax,ax+unit*.2,ax+unit*.8,ax2)-nx)*180/Math.PI-90; drawNeedle(ctx,nx,ny,ang,isMiao?1.0:.9); } }
  if(phase>=2){ const pr=ease(phase===2?p:1); strokePts(ctx,[{x:ax2,y:bY},{x:ax2,y:baseY}],pr,col,lw*.85); if(phase===2){drawNeedle(ctx,ax2,fy+aH*.38+(fy-36-(fy+aH*.38))*ease(p),-90,isMiao?1.1:1);} drawMarker(ctx,ax2,fy,ci+2,phase===2); }
  if(phase>=3){ ctx.save(); ctx.globalAlpha=0.18+0.28*ease(phase===3?p:1); strokePts(ctx,bezPts(ax,baseY,ax+unit*.2,arcTop*1.04,ax+unit*.8,arcTop*1.04,ax2,baseY),1,col,lw*.55); ctx.globalAlpha=1; ctx.restore(); }
}

// ─────────────────────────────────────────────
//  渲染一帧（含 clip 防超框 + 循环重置）
// ─────────────────────────────────────────────
function renderFrame(ctx, W, H) {
  const speed  = _curSpeed;
  const cycleT = _curIsMiao => (_T * speed) % 1;
  const nDone  = Math.floor(_T * speed) % 8;

  // ── 循环重置：超过 MAX_CYCLES 轮后归零 ──
  if (_T * speed >= MAX_CYCLES) { _T = 0; }

  const ct = (_T * speed) % 1;
  const isMiao = _curType === 'miao';

  // ── 底色 ──
  ctx.fillStyle='#fffdf6'; ctx.fillRect(0,0,W,H);

  // ── clip：绘制内容不超出 canvas 边界 ──
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

  if      (_curStitch==='flat')    drawFlat   (ctx,W,H,ct,nDone,isMiao);
  else if (_curStitch==='back')    drawBack   (ctx,W,H,ct,nDone,isMiao);
  else if (_curStitch==='blanket') drawBlanket(ctx,W,H,ct,nDone,isMiao);

  // ── 步骤指示条（最上层）──
  const {phase,p}=getPhase(ct,PB[_curStitch]);
  drawHeader(ctx,W,_curStitch,phase,p);

  ctx.restore();

  // ── 同步步骤卡片高亮 ──
  _syncStepCards(phase);
}

// 让步骤卡片跟随动画阶段高亮
function _syncStepCards(animPhase) {
  // phase 0 → card 0；phase 1/2 → card 1；phase 3 → card 2
  const cardIdx = animPhase <= 0 ? 0 : animPhase <= 2 ? 1 : 2;
  document.querySelectorAll('.step-card').forEach((c,i) => {
    c.classList.toggle('step-active', i === cardIdx);
  });
}

// ─────────────────────────────────────────────
//  公开接口
// ─────────────────────────────────────────────
window.selectStep = function(el) {
  document.querySelectorAll('.step-card').forEach(c=>c.classList.remove('step-active'));
  el.classList.add('step-active');
};

window.selectPill = function(el) {
  // 切换前先停止当前讲解，让 3D 模型回 idle
  stop();
  if (typeof window.stopLipsync === 'function') window.stopLipsync();

  const row=el.closest('.control-row');
  if(row) row.querySelectorAll('.pill-btn').forEach(b=>b.classList.remove('pill-active'));
  el.classList.add('pill-active');
  _T=0;
  if(typeof window.updateDemo==='function') window.updateDemo();
};

window.toggleStitchAnimation = function() {
  const btn=document.getElementById('playPauseBtn');
  if(!btn) return;
  _isAnimating=!_isAnimating;
  if(_isAnimating){ btn.innerHTML='<span class="icon-pause"></span>'; btn.classList.remove('paused'); if(typeof window.updateDemo==='function') window.updateDemo(); }
  else { btn.innerHTML='<span class="icon-play"></span>'; btn.classList.add('paused'); if(_raf){cancelAnimationFrame(_raf);_raf=null;} }
};

// ─────────────────────────────────────────────
//  主更新函数（含 canvas 点击事件绑定）
// ─────────────────────────────────────────────
window.updateDemo = function() {
  const sBtn=document.querySelector('.pill-btn.pill-active[data-stitch]');
  const tBtn=document.querySelector('.pill-btn.pill-active[data-type]');
  _curStitch = sBtn ? sBtn.dataset.stitch : 'flat';
  _curType   = tBtn ? tBtn.dataset.type   : 'su';
  _curSpeed  = _curType==='miao' ? 0.10 : 0.08;

  const INFO={
    flat:    {su:{t:'平针 · 苏绣',d:'正面均匀走行，留下平整细密的线段，正背面短长交替，精致规律。'},miao:{t:'平针 · 苗绣',d:'步距宽大色彩鲜艳，大色块铺陈，展现苗绣奔放的几何装饰风格。'}},
    back:    {su:{t:'回针 · 苏绣',d:'每针向后插入前孔，正面形成连续实线，背面走大弧，细腻轮廓首选。'},miao:{t:'回针 · 苗绣',d:'退针步距更大，背面弧更饱满，绣出粗犷有力的图腾轮廓线。'}},
    blanket: {su:{t:'锁边针 · 苏绣',d:'线绕大弧穿过线圈收紧，形成精致均匀的锁扣，常用于绣品镶边。'},miao:{t:'锁边针 · 苗绣',d:'弧幅更大更粗壮，锁扣密实有力，牢固加固厚重布料边缘。'}},
  };
  const info=INFO[_curStitch][_curType];
  const te=document.getElementById('demoTitle'); if(te) te.textContent=info.t;
  const de=document.getElementById('demoDesc');  if(de) de.textContent=info.d;

  const vis=document.getElementById('demoVisual'); if(!vis) return;
  if(!document.getElementById('stitchCanvas')){
    vis.innerHTML='<canvas id="stitchCanvas" style="width:100%;height:100%;display:block;cursor:pointer;"></canvas>';
    setTimeout(()=>window.updateDemo(),80); return;
  }
  if(_raf){cancelAnimationFrame(_raf);_raf=null;}

  const canvas=document.getElementById('stitchCanvas'); if(!canvas) return;

  // ── 绑定 canvas 点击事件（圆点可点击）──
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const lx   = (e.clientX - rect.left);   // logical px
    const ly   = (e.clientY - rect.top);
    for(const dot of _dotPositions){
      if(Math.hypot(lx-dot.cx, ly-dot.cy) <= dot.r){
        window.jumpToPhase(dot.phaseIdx);
        return;
      }
    }
  };

  const rect=canvas.getBoundingClientRect();
  if(rect.width===0||rect.height===0){setTimeout(()=>window.updateDemo(),80);return;}
  const dpr=window.devicePixelRatio||1;
  canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  const W=rect.width, H=rect.height;

  if(!_isAnimating){ renderFrame(ctx,W,H); return; }

  function loop(){
    if(!_isAnimating){_raf=null;return;}
    _T+=0.007;
    renderFrame(ctx,W,H);
    _raf=requestAnimationFrame(loop);
  }
  loop();
};

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{if(typeof window.updateDemo==='function') window.updateDemo();},120);
});