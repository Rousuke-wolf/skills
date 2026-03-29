import './script.js'
import './game.css'

export function renderGame() {
  return `
  <div id="game-root">
    <!-- ✅ 唯一 modal -->
    <div class="overlay" id="ov" onclick="ovClick(event)">
      <div class="modal">
        <div class="modal-hd">
          <div class="modal-title">刺绣游戏体验</div>
          <div class="modal-sub">选择游戏，亲手完成一幅刺绣作品</div>
          <button class="close-btn" onclick="closeModal()">✕</button>
        </div>

        <div class="screen active" id="s-select">
          <div class="game-select">
            <div class="game-card" onclick="startGame('trace')">
              <div class="g-icon">🪡</div>
              <div class="g-name">描线走针</div>
              <div class="g-desc">沿引导线描绘针迹，完成 5 次描线后产出作品。</div>
            </div>
            <div class="game-card" onclick="startGame('jigsaw')">
              <div class="g-icon">🧩</div>
              <div class="g-name">针法识别</div>
              <div class="g-desc">识别全部 9 块后产出作品。</div>
            </div>
          </div>
        </div>

        <div class="screen" id="s-trace">
          <div class="game-hd">
            <span class="back-btn" onclick="goBack()">← 返回</span>
            <span class="g-title">描线走针</span>
            <span class="g-score">准确度 <span id="t-acc">—</span></span>
          </div>
          <div class="pill-row">
            <button class="s-pill on" data-s="flat" onclick="pickStitch(this)">平针</button>
            <button class="s-pill" data-s="back" onclick="pickStitch(this)">回针</button>
            <button class="s-pill" data-s="blanket" onclick="pickStitch(this)">锁边针</button>
          </div>
          <div class="prog-wrap"><div class="prog-fill" id="t-prog"></div></div>
          <div class="cvs-wrap">
            <canvas id="tCvs"></canvas>
            <div class="hint" id="t-hint"></div>
          </div>
        </div>

        <div class="screen" id="s-jig">
          <div class="game-hd">
            <span class="back-btn" onclick="goBack()">← 返回</span>
            <span class="g-title">针法识别</span>
            <span class="g-score">已完成 <span id="j-cnt">0</span> / 9</span>
          </div>
          <div class="jig-wrap">
            <div class="jig-grid" id="jigGrid"></div>
            <div class="hint" id="j-hint"></div>
            <div class="jig-opts" id="jigOpts"></div>
          </div>
        </div>

        <div class="screen" id="s-done">
          <div class="done-wrap">
            <div class="done-title">✦ 作品完成 ✦</div>
            <canvas id="doneCvs" class="done-cvs"></canvas>
            <div class="done-sub" id="done-txt"></div>
            <div class="btn-row">
              <button class="c-btn" onclick="goBack()">再玩一次</button>
              <button class="c-btn" onclick="closeModal()">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `
}

/* ✅ 自动挂载（关键！！！） */
if (!document.getElementById('game-root')) {
  document.body.insertAdjacentHTML('beforeend', renderGame())
}
