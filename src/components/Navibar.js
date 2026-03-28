/// ─────────────────────────────────────────────
// 公共：导航栏 — 参考图暖白色风格
// ─────────────────────────────────────────────
export function buildNavbar(activePage) {
  const tabs = [
    { id: 'home', label: '首页' },
    { id: 'culture', label: '刺绣文化' },
    { id: 'teaching', label: '教学体验' },
    { id: '3d', label: '3D展厅' },
    { id: 'about', label: '关于我们' },
  ]
  const links = tabs.map(t => `
    <a class="nav-tab ${activePage === t.id ? 'active' : ''}"
       href="#" onclick="renderApp('${t.id}');return false;">${t.label}</a>
  `).join('')
  return `
    <div class="navbar">
      <div class="nav-logo">
        <div class="nav-logo-icon">绣</div>
        <span class="nav-logo-text">智传非遗</span>
      </div>
      <div class="nav-center">
        ${links}
      </div>
      <div class="nav-right">
        <button class="nav-cta-btn" onclick="renderApp('teaching');return false;">刺绣教学模式</button>
      </div>
    </div>
  `
}
