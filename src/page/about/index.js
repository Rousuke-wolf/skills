// import { buildNavbar } from "../../components/Navibar";
// // ─────────────────────────────────────────────
// // 关于我们页
// // ─────────────────────────────────────────────

// export default function buildAboutPage() {
//   return `
//     <div class="app-wrapper page-about">
//       ${buildNavbar('about')}
//       <div class="about-page">
//         <div class="about-hero">
//           <div class="about-hero-inner">
//             <div class="about-badge">🧵 关于我们</div>
//             <h1 class="about-title">智传非遗</h1>
//             <p class="about-subtitle">用数字技术守护千年绣艺，让非物质文化遗产在当代焕发生机</p>
//           </div>
//           <div class="about-deco-circle about-deco-1"></div>
//           <div class="about-deco-circle about-deco-2"></div>
//         </div>

//         <div class="about-cards">
//           <div class="about-card">
//             <div class="about-card-icon">🎯</div>
//             <div class="about-card-title">项目使命</div>
//             <div class="about-card-text">以 AI 数字人为媒介，将中国传统刺绣的精湛技艺以生动、直观的方式呈现给大众，推动非物质文化遗产的数字化传承与创新发展。</div>
//           </div>
//           <div class="about-card">
//             <div class="about-card-icon">🤖</div>
//             <div class="about-card-title">核心技术</div>
//             <div class="about-card-text">融合 Live2D 数字人、大语言模型 AI、语音合成 TTS、3D 模型展示等前沿技术，打造沉浸式非遗教学与体验平台。</div>
//           </div>
//           <div class="about-card">
//             <div class="about-card-icon">🌏</div>
//             <div class="about-card-title">文化价值</div>
//             <div class="about-card-text">聚焦苗绣、苏绣等代表性刺绣流派，通过步骤教学、针法演示、文化讲解，让更多人了解并爱上中国刺绣之美。</div>
//           </div>
//         </div>

//         <div class="about-team">
//           <div class="about-section-title">项目团队</div>
//           <div class="about-team-grid">
//             <div class="about-member">
//               <div class="about-member-avatar">🎨</div>
//               <div class="about-member-name">UI / 交互设计</div>
//               <div class="about-member-role">界面设计与用户体验</div>
//             </div>
//             <div class="about-member">
//               <div class="about-member-avatar">💻</div>
//               <div class="about-member-name">前端开发</div>
//               <div class="about-member-role">Vite · Live2D · 3D展示</div>
//             </div>
//             <div class="about-member">
//               <div class="about-member-avatar">🤖</div>
//               <div class="about-member-name">AI 接入</div>
//               <div class="about-member-role">大模型 · TTS 语音合成</div>
//             </div>
//             <div class="about-member">
//               <div class="about-member-avatar">🧵</div>
//               <div class="about-member-name">内容策划</div>
//               <div class="about-member-role">非遗文化研究与内容撰写</div>
//             </div>
//           </div>
//         </div>

//         <div class="about-footer-note">
//           本项目为非遗数字化传承课题研究成果 · 指导老师：待填写
//         </div>
//       </div>
//     </div>
//   `
// }
import { buildNavbar } from "../../components/Navibar";

// ─────────────────────────────────────────────
// 关于我们页（超紧凑版 · 纵向几乎贴合）
// ─────────────────────────────────────────────

export default function buildAboutPage() {
  return `
    <div class="app-wrapper page-about" style="background:#F5F5F5;">
      ${buildNavbar('about')}
      
      <div class="about-page" style="max-width:1200px; margin:0 auto; padding:0 24px;">
        
        <!-- 顶部标题区 -->
        <div class="about-hero" style="padding:30px 0; border-bottom:1px solid #E0E0E0; margin-bottom:20px;">
          <div class="about-hero-inner">
            <div class="about-badge" style="font-size:14px; color:#8B5A3B;">🧵 关于我们</div>
            <h1 class="about-title" style="font-size:36px; color:#333; margin:10px 0;">智传非遗</h1>
            <p class="about-subtitle" style="font-size:16px; color:#666;">用数字技术守护千年绣艺，让非物质文化遗产在当代焕发生机</p>
          </div>
        </div>

        <!-- 项目简介 + 使命（紧贴） -->
<div class="about-section" style="margin:20px 0;">
  <div class="about-overview" style="display:flex; gap:24px; align-items:stretch;">
    <div style="flex:1; background:#fff; border:1px solid #eee; border-radius:16px; padding:24px;">
      <h3 style="margin:0 0 10px; color:#8b5a3b; font-size:18px;">📝 项目简介</h3>
      <p style="margin:0; line-height:1.6; font-size:14px;">
        本项目深度融合 AI 大模型、Live2D 数字人、3D 可视化技术，打造非遗刺绣沉浸式传承平台。
      </p>
    </div>
    <div style="flex:1; background:#fff; border:1px solid #eee; border-radius:16px; padding:24px;">
      <h3 style="margin:0 0 10px; color:#8b5a3b; font-size:18px;">🎯 项目使命</h3>
      <p style="margin:0; line-height:1.6; font-size:14px;">
        以科技为翼，守护非遗匠心，让传统刺绣轻量化、趣味化、普及化。
      </p>
    </div>
  </div>
</div>

        <!-- 核心技术 + 项目特色（紧贴） -->
<div class="about-section" style="margin:20px 0;">
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
    <div>
      <h3 style="text-align:center; font-size:18px; color:#8b5a3b; margin-bottom:10px;">⚙️ 功能模块</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#fff; padding:16px; border-radius:12px;">🎤 数字人交互<br><span style="font-size:12px;">Live2D 实时渲染</span></div>
        <div style="background:#fff; padding:16px; border-radius:12px;">🤖 AI智能问答<br><span style="font-size:12px;">千问大模型 + RAG</span></div>
        <div style="background:#fff; padding:16px; border-radius:12px;">🪡 刺绣教学<br><span style="font-size:12px;">针法动画可视化</span></div>
        <div style="background:#fff; padding:16px; border-radius:12px;">🌐 3D沉浸体验<br><span style="font-size:12px;">三维模型展示</span></div>
      </div>
    </div>

    <div>
      <h3 style="text-align:center; font-size:18px; color:#8b5a3b; margin-bottom:10px;">✨ 项目技术实现</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="background:#fff; padding:16px; border-radius:12px;">🎯 领域化问答<br><span style="font-size:12px;">专业知识库</span></div>
        <div style="background:#fff; padding:16px; border-radius:12px;">📌 可视化教学<br><span style="font-size:12px;">针法动画拆解</span></div>
        <div style="background:#fff; padding:16px; border-radius:12px;">🖼️ 3D数字展品<br><span style="font-size:12px;">展品360°浏览</span></div>
        <div style="background:#fff; padding:16px; border-radius:12px;">☁️ 轻量化部署<br><span style="font-size:12px;">浏览器即用</span></div>
      </div>
    </div>
  </div>
</div>

        <!-- 功能 + 场景（紧贴） -->
        <div class="about-section" style="margin:20px 0;">
          <div style="background:#fff; padding:24px; border-radius:16px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
              <div>
                <h4 style="margin:0 0 10px; font-size:16px; color:#8b5a3b;">🧩 项目特色</h4>
               <div style="font-size:13px; line-height:1.5;">• 非遗数字化传承 • 沉浸式交互体验 • 低门槛轻量化 • 产学研一体化</div>
              </div>
              <div>
                <h4 style="margin:0 0 10px; font-size:16px; color:#8b5a3b;">📍 应用场景</h4>
                <div style="font-size:13px; line-height:1.5;">• 校园美育课堂 • 非遗线上传播 • 博物馆互动展陈 • 大众零基础学习</div>
              </div>
            </div>
          </div>
        </div>

        
        <!-- 底部（紧贴） -->
        <div class="about-footer-note" style="text-align:center; padding:20px 0; font-size:12px; color:#666; border-top:1px solid #eee;">
          本项目为非遗数字化传承课题研究成果 · 指导老师：待填写
        </div>
      </div>
    </div>
  `;
}


