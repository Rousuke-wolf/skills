// ─────────────────────────────────────────────
// 刺绣文化页

import { buildNavbar } from "../../components/Navibar";

// ─────────────────────────────────────────────
export default function buildCulturePage() {
  return `
    <div class="app-wrapper page-culture">
      ${buildNavbar('culture')}

      <div class="main-dashboard culture-dashboard">
        <!-- 左侧：Live2D 引导员 + 刺绣环境 -->
        <div class="left-stage">
          <div class="character-section">
            <div class="character-3d">
              <canvas id="live2d" style="width:100%; height:100%;"></canvas>
            </div>
            <div class="live2d-label">
              <span>Live2D</span>
              <span>引导员</span>
            </div>
          </div>
          
          <!-- 刺绣环境装饰区 -->
          <div class="embroidery-environment">
            <div class="env-placeholder">
              <div class="env-icon">🧵</div>
              <div class="env-text">刺绣环境</div>
            </div>
          </div>
        </div>

        <!-- 右侧：文本框 + 卡片区 -->
        <div class="right-panel culture-right-panel">
          
          <!-- 上方：文本框 -->
          <div class="culture-text-box">
            <div class="culture-text-title">刺绣文化</div>
            <div class="culture-text-content">
              刺绣是中国最古老的传统手工艺之一，已有数千年历史。以针为笔、以线为墨，在丝绸或布料上绣出山川花鸟、人物故事。<br><br>
              中国刺绣主要分为苏绣、湘绣、蜀绣、粤绣四大名绣，各具特色，共同构成了中华刺绣艺术的瑰宝。
            </div>
          </div>

          <!-- 下方：卡片区 -->
          <div class="culture-cards-container">
            <div class="section-title">四大名绣</div>
            <div class="culture-grid">
              <div class="culture-item">
                <div class="culture-num">01</div>
                <div class="culture-item-title">苏绣 · 吴中绣艺</div>
                <div class="culture-item-text">苏州刺绣以精细雅洁著称，色彩清新，图案生动，素有"针尖上的芭蕾"之美誉。双面绣更是苏绣一绝。</div>
              </div>
              <div class="culture-item">
                <div class="culture-num">02</div>
                <div class="culture-item-title">湘绣 · 湖南绣法</div>
                <div class="culture-item-text">湘绣以狮虎为代表，用毛针法绣出毛茸茸的质感，色彩鲜艳浓烈，展现湖湘文化的豪放气质。</div>
              </div>
              <div class="culture-item">
                <div class="culture-num">03</div>
                <div class="culture-item-title">蜀绣 · 天府绣艺</div>
                <div class="culture-item-text">蜀绣源于古蜀，构图疏朗明快，线条流畅，具有浓郁地方特色和独特的艺术风格。</div>
              </div>
              <div class="culture-item">
                <div class="culture-num">04</div>
                <div class="culture-item-title">粤绣 · 岭南绣技</div>
                <div class="culture-item-text">粤绣涵盖广绣和潮绣，构图饱满均匀，色彩浓烈，富有南方热带风情。</div>
              </div>
            </div>

            <div class="section-title">针法与传承</div>
            <div class="stitch-row">
              <div class="stitch-card">
                <div class="stitch-emoji">🪡</div>
                <div class="stitch-name">平针</div>
                <div class="stitch-desc">最基础的针法，线迹平行排列，填充图案面积</div>
              </div>
              <div class="stitch-card">
                <div class="stitch-emoji">↩️</div>
                <div class="stitch-name">回针</div>
                <div class="stitch-desc">向后一针再向前两针，形成连续轮廓线迹</div>
              </div>
              <div class="stitch-card">
                <div class="stitch-emoji">🔗</div>
                <div class="stitch-name">锁边针</div>
                <div class="stitch-desc">沿边缘锁扣，装饰与加固布料边缘</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
