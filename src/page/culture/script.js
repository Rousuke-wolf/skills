// ── 刷新卡片（全局，onclick 调用）─────────────
window.refreshCultureCards = function () {
  const grid = document.getElementById('cultureCardGrid');
  if (!grid) return;
  grid.style.opacity = '0';
  grid.style.transform = 'translateY(6px)';
  grid.style.transition = 'opacity 0.18s, transform 0.18s';
  setTimeout(() => {
    grid.innerHTML = buildCards(pickRandom4());
    grid.style.opacity = '1';
    grid.style.transform = 'translateY(0)';
    if (window._cultureInputLocked) {
      document.querySelectorAll('.culture-mini-card').forEach(c => {
        c.style.pointerEvents = 'none';
        c.style.opacity = '0.45';
      });
    }
  }, 180);
}

// ── 对话气泡 ─────────────────────────────────
const GREET_LINES = [
  ['你好呀～', '有什么想了解的', '刺绣知识吗？'],
  ['欢迎来到刺绣工坊～', '我是绫韵，', '请尽管发问！'],
  ['绫韵在线～🧵', '刺绣的世界', '等你来探索！'],
  ['有什么想问我的，', '尽管说吧～', ''],
]
window.showSpeechBubble = function (lines) {
  const bubble = document.getElementById('live2dBubble');
  const t1 = document.getElementById('bubbleText');
  const t2 = document.getElementById('bubbleText2');
  const t3 = document.getElementById('bubbleText3');
  if (!bubble || !t1) return;

  t1.textContent = lines[0] || '';
  t2.textContent = lines[1] || '';
  t3.textContent = lines[2] || '';

  const isLeft = Math.random() > 0.5;
  const topOffset = 4 + Math.random() * 10;
  bubble.style.top = topOffset + '%';
  bubble.style.transform = '';

  const svg = bubble.querySelector('.bubble-svg');

  // 先设置 class
  if (isLeft) {
    svg.classList.add('flipped');
    bubble.style.right = 'auto';
    bubble.style.left = (8 + Math.random() * 10) + '%';
    t1.style.transform = 'scaleX(-1)';
    t2.style.transform = 'scaleX(-1)';
    t3.style.transform = 'scaleX(-1)';
  } else {
    svg.classList.remove('flipped');
    bubble.style.left = 'auto';
    bubble.style.right = (10 + Math.random() * 14) + '%';
    t1.style.transform = '';
    t2.style.transform = '';
    t3.style.transform = '';
  }

  bubble.classList.remove('hidden');

  // 重置动画
  if (svg) {
    svg.style.animation = 'none';
    svg.offsetHeight;
    svg.style.animation = '';
  }
}
window.hideSpeechBubble = function () {
  document.getElementById('live2dBubble')?.classList.add('hidden');
}

window.showRandomGreet = function () {
  const lines = GREET_LINES[Math.floor(Math.random() * GREET_LINES.length)];
  showSpeechBubble(lines);
}
