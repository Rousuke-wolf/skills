// ./page/teach/scripts.js
// 针法动画 v2 — 分步图解，步骤说明绘于 canvas 顶部

// ─── 全局状态 ─────────────────────────────────
let _isAnimating = true;
let _raf         = null;
let _T           = 0;

// ─── 步骤指示条高度 ───────────────────────────
const SH = 66;

// ─── 分步文案 ─────────────────────────────────
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

// 各阶段时间边界（累积，0→1）
const PB = {
  flat:    [0, 0.28, 0.48, 0.74, 1.0],
  back:    [0, 0.25, 0.50, 0.75, 1.0],
  blanket: [0, 0.26, 0.54, 0.78, 1.0],
};

// ─── 缓动 ─────────────────────────────────────
const ease    = x => x < 0.5 ? 2*x*x : 1 - Math.pow(-2*x+2, 2)/2;
const easeOut = x => 1 - Math.pow(1-x, 3);

// ─── 贝塞尔插值 ───────────────────────────────
function bez(t, a, b, c, d) {
  const m = 1-t;
  return m*m*m*a + 3*m*m*t*b + 3*m*t*t*c + t*t*t*d;
}
function bezPts(x0,y0,cx1,cy1,cx2,cy2,x1,y1, n=40) {
  const pts=[];
  for(let i=0;i<=n;i++){const t=i/n; pts.push({x:bez(t,x0,cx1,cx2,x1),y:bez(t,y0,cy1,cy2,y1)});}
  return pts;
}

// ─── 获取当前阶段 & 阶段内进度 ────────────────
function getPhase(ct, bounds) {
  for(let i=0;i<bounds.length-1;i++){
    if(ct<=bounds[i+1]){
      return { phase:i, p: Math.min((ct-bounds[i])/(bounds[i+1]-bounds[i]),1) };
    }
  }
  return {phase:bounds.length-2, p:1};
}

// ─────────────────────────────────────────────
//  步骤指示条（canvas 顶部 SH px）
// ─────────────────────────────────────────────
function drawHeader(ctx, W, stitch, phase, phP) {
  const steps = STEPS[stitch];

  // 背景
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, W, SH);
  // 底部细线
  ctx.strokeStyle = 'rgba(180,148,100,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,SH); ctx.lineTo(W,SH); ctx.stroke();

  // ── 序号圆点 & 连线 ──
  const n    = steps.length;
  const dotR = 11;
  const gap  = 50;
  const sx   = 28;
  const dy   = 20;

  for(let i=0;i<n-1;i++){
    const x1 = sx + i*gap + dotR + 3;
    const x2 = sx + (i+1)*gap - dotR - 3;
    const done = i < phase;
    ctx.strokeStyle = done ? '#c8a060' : '#e2d6be';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1,dy); ctx.lineTo(x2,dy); ctx.stroke();
  }

  for(let i=0;i<n;i++){
    const cx = sx + i*gap;
    const isActive = i===phase;
    const isDone   = i<phase;

    // 光晕
    if(isActive){
      ctx.beginPath(); ctx.arc(cx,dy,dotR+5,0,Math.PI*2);
      ctx.fillStyle='rgba(192,144,60,0.14)'; ctx.fill();
    }
    // 圆底
    ctx.beginPath(); ctx.arc(cx,dy,dotR,0,Math.PI*2);
    if(isActive){
      const g=ctx.createRadialGradient(cx-2,dy-2,1,cx,dy,dotR);
      g.addColorStop(0,'#e8b050'); g.addColorStop(1,'#9c7028');
      ctx.fillStyle=g;
    } else if(isDone){
      ctx.fillStyle='#c8a878';
    } else {
      ctx.fillStyle='#ece3cf';
    }
    ctx.fill();
    // 数字
    ctx.font=`bold ${isActive?12:10}px sans-serif`;
    ctx.fillStyle=isActive||isDone?'#fff':'#b09870';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(i+1),cx,dy);
  }

  // ── 步骤标题 & 描述 ──
  const cur  = steps[phase];
  const tx   = sx + (n-1)*gap + dotR + 18;
  const avail= W - tx - 16;

  ctx.textAlign='left';
  ctx.font=`bold 13px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle='#6b3e18';
  ctx.textBaseline='top';
  ctx.fillText(`${phase+1}. ${cur.title}`, tx, 6);

  ctx.font=`11.5px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle='#a08060';
  ctx.fillText(cur.desc, tx, 24);

  // 进度条
  const bx=tx, bw=Math.min(avail, 260), by=SH-11;
  ctx.fillStyle='#ece3cf';
  ctx.beginPath(); _rr(ctx,bx,by,bw,5,3); ctx.fill();
  ctx.fillStyle='#c8a060';
  ctx.beginPath(); _rr(ctx,bx,by,Math.max(0,bw*ease(phP)),5,3); ctx.fill();
}

function _rr(ctx,x,y,w,h,r){
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.lineTo(x+w,y+h-r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.lineTo(x,y+r);
  ctx.arcTo(x,y,x+w,y,r);
}

// ─────────────────────────────────────────────
//  布料背景
// ─────────────────────────────────────────────
function drawFabric(ctx, W, fy, top, animH) {
  // 正面
  ctx.fillStyle='#fdfaf3';
  ctx.fillRect(0,top,W,fy-top);
  // 背面
  ctx.fillStyle='#f4ead8';
  ctx.fillRect(0,fy,W,top+animH-fy);

  // 布料纹理（细斜线）
  ctx.save(); ctx.strokeStyle='rgba(160,130,80,0.06)'; ctx.lineWidth=0.7;
  for(let x=-animH*2;x<W+animH;x+=8){
    ctx.beginPath(); ctx.moveTo(x,fy); ctx.lineTo(x+animH,fy+animH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x,fy); ctx.lineTo(x-animH*0.6,fy-animH*0.6); ctx.stroke();
  }
  ctx.restore();

  // 布料主线
  ctx.save();
  ctx.shadowColor='rgba(60,30,10,0.22)'; ctx.shadowBlur=5; ctx.shadowOffsetY=2;
  ctx.strokeStyle='#1e1208'; ctx.lineWidth=4.5; ctx.lineCap='butt';
  ctx.beginPath(); ctx.moveTo(18,fy); ctx.lineTo(W-18,fy); ctx.stroke();
  ctx.restore();

  // 正面标注
  ctx.save();
  ctx.font='bold 12px "Noto Serif SC","SimSun",serif';
  ctx.fillStyle='#5c3d1e'; ctx.textBaseline='bottom';
  ctx.fillText('正面',26,fy-9);
  ctx.strokeStyle='rgba(120,80,40,0.16)'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(26,fy-7); ctx.lineTo(W-26,fy-7); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  // 背面标注
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

  ctx.shadowColor='rgba(50,25,5,0.28)'; ctx.shadowBlur=7;
  ctx.shadowOffsetX=2; ctx.shadowOffsetY=3;

  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(bW*0.5,L*0.1,bW,L*0.28,bW,L*0.55);
  ctx.bezierCurveTo(bW,L*0.80,bW*0.82,L*0.92,0,L);
  ctx.bezierCurveTo(-bW*0.82,L*0.92,-bW,L*0.80,-bW,L*0.55);
  ctx.bezierCurveTo(-bW,L*0.28,-bW*0.5,L*0.1,0,0);
  ctx.closePath();
  ctx.fillStyle=g; ctx.fill();
  ctx.shadowColor='transparent';

  // 针眼
  ctx.fillStyle='rgba(60,38,12,0.52)';
  ctx.beginPath(); ctx.ellipse(0,L*0.82,bW*0.38,bW*0.72,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,245,210,0.30)';
  ctx.beginPath(); ctx.ellipse(0,L*0.82,bW*0.18,bW*0.34,0,0,Math.PI*2); ctx.fill();

  // 高光
  ctx.strokeStyle='rgba(255,252,220,0.55)'; ctx.lineWidth=0.9;
  ctx.beginPath();
  ctx.moveTo(-bW*0.18,L*0.14);
  ctx.bezierCurveTo(-bW*0.28,L*0.38,-bW*0.32,L*0.60,-bW*0.22,L*0.78);
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────
//  穿孔标记
// ─────────────────────────────────────────────
function drawMarker(ctx, x, y, num, active) {
  const r=7;
  // 白底
  ctx.beginPath(); ctx.arc(x,y,r+2,0,Math.PI*2);
  ctx.fillStyle='#fff'; ctx.fill();
  // 圆圈
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=active?'#c0392b':'rgba(150,112,55,0.5)';
  ctx.lineWidth=active?2:1.5; ctx.stroke();
  // 圈内数字
  ctx.font=`bold 8px sans-serif`;
  ctx.fillStyle=active?'#c0392b':'#a08048';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(String(num),x,y);
  // 上方序号
  ctx.font=`bold 11px "Noto Sans SC",sans-serif`;
  ctx.fillStyle=active?'#c0392b':'#b09060';
  ctx.textBaseline='bottom';
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
  ctx.save();
  ctx.strokeStyle=color; ctx.lineWidth=lw;
  ctx.lineCap='round'; ctx.lineJoin='round';
  if(dash) ctx.setLineDash([9,5]);
  ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=0;i<segs.length;i++){
    if(rem<=0) break;
    if(rem>=segs[i]){ ctx.lineTo(pts[i+1].x,pts[i+1].y); rem-=segs[i]; }
    else{ const f=rem/segs[i]; ctx.lineTo(pts[i].x+(pts[i+1].x-pts[i].x)*f,pts[i].y+(pts[i+1].y-pts[i].y)*f); rem=0; }
  }
  ctx.stroke();
  if(dash) ctx.setLineDash([]);
  ctx.restore();
}

// ─────────────────────────────────────────────
//  平针
// ─────────────────────────────────────────────
function drawFlat(ctx, W, H, ct, nDone, isMiao) {
  const top=SH, aH=H-SH, fy=top+aH*0.40;
  drawFabric(ctx,W,fy,top,aH);

  const mg=70, span=W-mg*2;
  const nV=isMiao?3:4;
  const unit=span/nV;
  const fw=unit*0.62;       // 正面段宽
  const bw=unit-fw;         // 背面弧宽
  const fY=fy-32;           // 正面线 y
  const bPk=fy+32;          // 背面弧峰
  const col=isMiao?'#d4433a':'#c0392b';
  const lw=isMiao?3.8:3.2;
  const fade=isMiao?'rgba(212,67,58,0.22)':'rgba(192,57,43,0.20)';

  // 历史针脚
  const hist=Math.min(nDone,nV-1);
  for(let i=0;i<hist;i++){
    const x0=mg+i*unit;
    strokePts(ctx,[{x:x0,y:fY},{x:x0+fw,y:fY}],1,fade,lw);
    strokePts(ctx,bezPts(x0+fw,bPk,x0+fw+bw*0.4,bPk+10,x0+unit-bw*0.4,bPk+10,x0+unit,bPk),1,fade,lw*.8,true);
    drawMarker(ctx,x0,fy,i*2+1,false);
    drawMarker(ctx,x0+fw,fy,i*2+2,false);
  }

  const ci=hist, x0=mg+ci*unit;
  const {phase,p}=getPhase(ct,PB.flat);

  // ① 正面段
  if(phase>=0){ strokePts(ctx,[{x:x0,y:fY},{x:x0+fw*ease(phase===0?p:1),y:fY}],1,col,lw); }
  drawMarker(ctx,x0,fy,ci*2+1,phase===0);

  // ② 针穿入
  if(phase>=1){
    const pr=ease(phase===1?p:1);
    const ny=fy-30+(fy+aH*.35-(fy-30))*pr;
    drawNeedle(ctx,x0+fw,ny,88,isMiao?1.1:1);
    drawMarker(ctx,x0+fw,fy,ci*2+2,phase===1);
  }

  // ③ 背面弧
  if(phase>=2){
    strokePts(ctx,bezPts(x0+fw,bPk,x0+fw+bw*.4,bPk+10,x0+unit-bw*.4,bPk+10,x0+unit,bPk),
              ease(phase===2?p:1),col,lw*.85,true);
  }

  // ④ 针穿出
  if(phase>=3){
    const pr=ease(phase===3?p:1);
    const sY=fy+aH*.40, eY=fy-30;
    drawNeedle(ctx,x0+unit,sY+(eY-sY)*pr,-90,isMiao?1.1:1);
    drawMarker(ctx,x0+unit,fy,ci*2+3,phase===3);
  }
}

// ─────────────────────────────────────────────
//  回针
// ─────────────────────────────────────────────
function drawBack(ctx, W, H, ct, nDone, isMiao) {
  const top=SH, aH=H-SH, fy=top+aH*0.40;
  drawFabric(ctx,W,fy,top,aH);

  const mg=65, span=W-mg*2;
  const nV=isMiao?3:4;
  const step=span/(nV+1);
  const fY=fy-32, bPk=fy+(isMiao?46:38);
  const col=isMiao?'#7c3abf':'#c0392b';
  const lw=isMiao?3.8:3.2;
  const fade=isMiao?'rgba(124,58,191,0.22)':'rgba(192,57,43,0.20)';

  const startX=mg+step;
  const hist=Math.min(nDone,nV);

  // 历史
  if(hist>0){
    strokePts(ctx,[{x:startX,y:fY},{x:startX+hist*step,y:fY}],1,fade,lw);
  }
  for(let i=0;i<hist;i++){
    const ax=startX+i*step, bx=ax+step*2;
    strokePts(ctx,bezPts(ax,bPk,ax+(bx-ax)*.35,bPk+(isMiao?30:22),bx-(bx-ax)*.35,bPk+(isMiao?30:22),bx,bPk),1,fade,lw*.85,true);
    drawMarker(ctx,ax,fy,i*2+1,false);
    drawMarker(ctx,bx,fy,i*2+2,false);
  }

  const ci=hist;
  const ax=startX+ci*step, bx=ax+step*2, midX=ax+step;
  const {phase,p}=getPhase(ct,PB.back);

  // ① 正面向前两步
  if(phase>=0){
    strokePts(ctx,[{x:ax,y:fY},{x:ax+(bx-ax)*ease(phase===0?p:1),y:fY}],1,col,lw);
    drawMarker(ctx,ax,fy,ci*2+1,phase===0);
  }

  // ② 向后回针（bx→midX）
  if(phase>=1){
    const pr=ease(phase===1?p:1);
    strokePts(ctx,[{x:bx,y:fY},{x:bx-(bx-midX)*pr,y:fY}],1,col,lw);
    if(phase===1){ const ny=fy-30+(fy+20)*ease(p)*.7; drawNeedle(ctx,bx,ny,88,isMiao?1.1:1); }
    drawMarker(ctx,bx,fy,ci*2+2,phase<=1);
  }

  // ③ 背面大弧（midX → bx+step）
  if(phase>=2){
    const nextX=bx+step;
    strokePts(ctx,bezPts(midX,bPk,midX+(nextX-midX)*.35,bPk+(isMiao?32:24),nextX-(nextX-midX)*.35,bPk+(isMiao?32:24),nextX,bPk),
              ease(phase===2?p:1),col,lw*.85,true);
    drawMarker(ctx,midX,fy,ci*2+2,phase===2);
  }

  // ④ 针穿出
  if(phase>=3){
    const nextX=bx+step;
    const pr=ease(phase===3?p:1);
    const sY=fy+aH*.40, eY=fy-30;
    drawNeedle(ctx,nextX,sY+(eY-sY)*pr,-90,isMiao?1.1:1);
    drawMarker(ctx,nextX,fy,ci*2+3,phase===3);
  }
}

// ─────────────────────────────────────────────
//  锁边针
// ─────────────────────────────────────────────
function drawBlanket(ctx, W, H, ct, nDone, isMiao) {
  const top=SH, aH=H-SH, fy=top+aH*0.45;
  drawFabric(ctx,W,fy,top,aH);

  const mg=65, span=W-mg*2;
  const nV=isMiao?3:4;
  const unit=span/nV;
  const arcTop=fy-(isMiao?72:58);
  const bY=fy+(isMiao?26:20);
  const baseY=fy+5;
  const col=isMiao?'#d4433a':'#c0392b';
  const lw=isMiao?3.8:3.2;
  const fade=isMiao?'rgba(212,67,58,0.22)':'rgba(192,57,43,0.20)';

  // 底部基线
  ctx.save(); ctx.strokeStyle=col; ctx.globalAlpha=0.32; ctx.lineWidth=lw*.7;
  ctx.beginPath(); ctx.moveTo(mg,baseY); ctx.lineTo(W-mg,baseY); ctx.stroke();
  ctx.globalAlpha=1; ctx.restore();

  // 历史弧
  const hist=Math.min(nDone,nV-1);
  for(let i=0;i<hist;i++){
    const ax=mg+i*unit, ax2=ax+unit;
    strokePts(ctx,bezPts(ax,baseY,ax+unit*.2,arcTop,ax+unit*.8,arcTop,ax2,baseY),1,fade,lw);
    strokePts(ctx,[{x:ax,y:baseY},{x:ax,y:bY}],1,fade,lw*.8);
    drawMarker(ctx,ax,fy,i+1,false);
  }

  const ci=hist, ax=mg+ci*unit, ax2=ax+unit;
  const {phase,p}=getPhase(ct,PB.blanket);

  // ① 垂直下针
  if(phase>=0){
    const pr=ease(phase===0?p:1);
    strokePts(ctx,[{x:ax,y:baseY},{x:ax,y:baseY+(bY-baseY)*pr}],1,col,lw*.85);
    if(phase===0){
      const sY=fy-36, eY=baseY;
      drawNeedle(ctx,ax,sY+(eY-sY)*ease(p),90,isMiao?1.1:1);
    }
    drawMarker(ctx,ax,fy,ci+1,phase===0);
  }

  // ② 大弧延伸 + 针随弧移动
  if(phase>=1){
    const pr=ease(phase===1?p:1);
    strokePts(ctx,bezPts(ax,baseY,ax+unit*.2,arcTop,ax+unit*.8,arcTop,ax2,baseY),pr,col,lw);
    if(phase===1){
      const t=ease(p);
      const nx=bez(t,ax,ax+unit*.2,ax+unit*.8,ax2);
      const ny=bez(t,baseY,arcTop,arcTop,baseY);
      const t2=Math.min(t+0.02,1);
      const ang=Math.atan2(bez(t2,baseY,arcTop,arcTop,baseY)-ny,bez(t2,ax,ax+unit*.2,ax+unit*.8,ax2)-nx)*180/Math.PI-90;
      drawNeedle(ctx,nx,ny,ang,isMiao?1.0:.9);
    }
  }

  // ③ 穿圈锁扣（右侧竖线 + 针穿出）
  if(phase>=2){
    const pr=ease(phase===2?p:1);
    strokePts(ctx,[{x:ax2,y:bY},{x:ax2,y:baseY}],pr,col,lw*.85);
    if(phase===2){
      const sY=fy+aH*.38, eY=fy-36;
      drawNeedle(ctx,ax2,sY+(eY-sY)*ease(p),-90,isMiao?1.1:1);
    }
    drawMarker(ctx,ax2,fy,ci+2,phase===2);
  }

  // ④ 收紧（弧加粗渐强）
  if(phase>=3){
    ctx.save(); ctx.globalAlpha=0.18+0.28*ease(phase===3?p:1);
    strokePts(ctx,bezPts(ax,baseY,ax+unit*.2,arcTop*1.04,ax+unit*.8,arcTop*1.04,ax2,baseY),1,col,lw*.55);
    ctx.globalAlpha=1; ctx.restore();
  }
}

// ─────────────────────────────────────────────
//  渲染一帧
// ─────────────────────────────────────────────
function renderFrame(ctx, W, H, stitch, isMiao) {
  const speed = isMiao ? 0.10 : 0.08;
  const ct    = (_T * speed) % 1;
  const nDone = Math.floor(_T * speed) % 8;

  ctx.fillStyle='#fffdf6'; ctx.fillRect(0,0,W,H);

  if      (stitch==='flat')    drawFlat   (ctx,W,H,ct,nDone,isMiao);
  else if (stitch==='back')    drawBack   (ctx,W,H,ct,nDone,isMiao);
  else if (stitch==='blanket') drawBlanket(ctx,W,H,ct,nDone,isMiao);

  const {phase,p}=getPhase(ct,PB[stitch]);
  drawHeader(ctx,W,stitch,phase,p);
}

// ─────────────────────────────────────────────
//  公开接口
// ─────────────────────────────────────────────
window.selectStep = function(el){
  document.querySelectorAll('.step-card').forEach(c=>c.classList.remove('step-active'));
  el.classList.add('step-active');
};

window.selectPill = function(el){
  const row=el.closest('.control-row');
  if(row) row.querySelectorAll('.pill-btn').forEach(b=>b.classList.remove('pill-active'));
  el.classList.add('pill-active');
  _T=0;
  if(typeof window.updateDemo==='function') window.updateDemo();
};

window.toggleStitchAnimation = function(){
  const btn=document.getElementById('playPauseBtn');
  if(!btn) return;
  _isAnimating=!_isAnimating;
  if(_isAnimating){
    btn.innerHTML='<span class="icon-pause"></span>'; btn.classList.remove('paused');
    if(typeof window.updateDemo==='function') window.updateDemo();
  } else {
    btn.innerHTML='<span class="icon-play"></span>'; btn.classList.add('paused');
    if(_raf){cancelAnimationFrame(_raf);_raf=null;}
  }
};

window.updateDemo = function(){
  const sBtn=document.querySelector('.pill-btn.pill-active[data-stitch]');
  const tBtn=document.querySelector('.pill-btn.pill-active[data-type]');
  const stitch=sBtn?sBtn.dataset.stitch:'flat';
  const type  =tBtn?tBtn.dataset.type  :'su';
  const isMiao=type==='miao';

  const INFO={
    flat:    {su:{t:'平针 · 苏绣',d:'正面均匀走行，留下平整细密的线段，正背面短长交替，精致规律。'},
              miao:{t:'平针 · 苗绣',d:'步距宽大色彩鲜艳，大色块铺陈，展现苗绣奔放的几何装饰风格。'}},
    back:    {su:{t:'回针 · 苏绣',d:'每针向后插入前孔，正面形成连续实线，背面走大弧，适合细腻轮廓描绘。'},
              miao:{t:'回针 · 苗绣',d:'退针步距更大，背面弧更饱满，绣出粗犷有力的图腾轮廓线。'}},
    blanket: {su:{t:'锁边针 · 苏绣',d:'线绕大弧穿过线圈收紧，形成精致均匀的锁扣，常用于绣品镶边。'},
              miao:{t:'锁边针 · 苗绣',d:'弧幅更大更粗壮，锁扣密实有力，牢固加固厚重布料边缘。'}},
  };
  const info=INFO[stitch][type];
  const te=document.getElementById('demoTitle'); if(te) te.textContent=info.t;
  const de=document.getElementById('demoDesc');  if(de) de.textContent=info.d;

  const vis=document.getElementById('demoVisual'); if(!vis) return;
  if(!document.getElementById('stitchCanvas')){
    vis.innerHTML='<canvas id="stitchCanvas" style="width:100%;height:100%;display:block;"></canvas>';
    setTimeout(()=>window.updateDemo(),80); return;
  }
  if(_raf){cancelAnimationFrame(_raf);_raf=null;}

  const canvas=document.getElementById('stitchCanvas'); if(!canvas) return;
  const rect=canvas.getBoundingClientRect();
  if(rect.width===0||rect.height===0){setTimeout(()=>window.updateDemo(),80);return;}

  const dpr=window.devicePixelRatio||1;
  canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  const W=rect.width, H=rect.height;

  if(!_isAnimating){ renderFrame(ctx,W,H,stitch,isMiao); return; }

  function loop(){
    if(!_isAnimating){_raf=null;return;}
    _T+=0.007;
    renderFrame(ctx,W,H,stitch,isMiao);
    _raf=requestAnimationFrame(loop);
  }
  loop();
};

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>{if(typeof window.updateDemo==='function') window.updateDemo();},120);
});