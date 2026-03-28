import { buildNavbar } from "../../components/Navibar";
// ─────────────────────────────────────────────
// 关于我们页
// ─────────────────────────────────────────────

export default function buildAboutPage() {
  return `
    <div class="app-wrapper page-about">
      ${buildNavbar('about')}
      <div class="about-page">
        <div class="about-hero">
          <div class="about-hero-inner">
            <div class="about-badge">🧵 关于我们</div>
            <h1 class="about-title">智传非遗</h1>
            <p class="about-subtitle">用数字技术守护千年绣艺，让非物质文化遗产在当代焕发生机</p>
          </div>
          <div class="about-deco-circle about-deco-1"></div>
          <div class="about-deco-circle about-deco-2"></div>
        </div>

        <div class="about-cards">
          <div class="about-card">
            <div class="about-card-icon">🎯</div>
            <div class="about-card-title">项目使命</div>
            <div class="about-card-text">以 AI 数字人为媒介，将中国传统刺绣的精湛技艺以生动、直观的方式呈现给大众，推动非物质文化遗产的数字化传承与创新发展。</div>
          </div>
          <div class="about-card">
            <div class="about-card-icon">🤖</div>
            <div class="about-card-title">核心技术</div>
            <div class="about-card-text">融合 Live2D 数字人、大语言模型 AI、语音合成 TTS、3D 模型展示等前沿技术，打造沉浸式非遗教学与体验平台。</div>
          </div>
          <div class="about-card">
            <div class="about-card-icon">🌏</div>
            <div class="about-card-title">文化价值</div>
            <div class="about-card-text">聚焦苗绣、苏绣等代表性刺绣流派，通过步骤教学、针法演示、文化讲解，让更多人了解并爱上中国刺绣之美。</div>
          </div>
        </div>

        <div class="about-team">
          <div class="about-section-title">项目团队</div>
          <div class="about-team-grid">
            <div class="about-member">
              <div class="about-member-avatar">🎨</div>
              <div class="about-member-name">UI / 交互设计</div>
              <div class="about-member-role">界面设计与用户体验</div>
            </div>
            <div class="about-member">
              <div class="about-member-avatar">💻</div>
              <div class="about-member-name">前端开发</div>
              <div class="about-member-role">Vite · Live2D · 3D展示</div>
            </div>
            <div class="about-member">
              <div class="about-member-avatar">🤖</div>
              <div class="about-member-name">AI 接入</div>
              <div class="about-member-role">大模型 · TTS 语音合成</div>
            </div>
            <div class="about-member">
              <div class="about-member-avatar">🧵</div>
              <div class="about-member-name">内容策划</div>
              <div class="about-member-role">非遗文化研究与内容撰写</div>
            </div>
          </div>
        </div>

        <div class="about-footer-note">
          本项目为非遗数字化传承课题研究成果 · 指导老师：待填写
        </div>
      </div>
    </div>
  `
}
