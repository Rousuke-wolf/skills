/// ─────────────────────────────────────────────
// 公共：导航栏 — 暖白色风格 + 用户登录入口
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
      <div class="nav-center">${links}</div>
      <div class="nav-right">
        <div id="navUserArea" class="nav-user-area">
          <button class="nav-login-btn" onclick="renderApp('login');return false;">登录</button>
          <button class="nav-register-btn" onclick="window._goRegister?.();return false;">注册</button>
        </div>
      </div>
    </div>
  `
}

// 登录后更新导航栏
window.updateNavUser = function (username) {
  const area = document.getElementById('navUserArea')
  if (!area) return
  area.innerHTML = `
    <div class="nav-user-menu" id="navUserMenu">
      <span class="nav-user-name">👤 欢迎，${username}</span>
      <a class="nav-profile-link" href="#" onclick="renderApp('profile');return false;">个人中心</a>
      <div class="nav-logout-wrap">
        <button class="nav-user-logout" id="navLogoutBtn" title="退出登录">退出</button>
        <div class="nav-logout-popup" id="navLogoutPopup">
          <span class="popup-text">确认退出吗？</span>
          <button class="popup-confirm" id="popupConfirm">确认</button>
          <button class="popup-cancel" id="popupCancel">取消</button>
        </div>
      </div>
    </div>
  `
  setTimeout(() => {
    const logoutBtn = document.getElementById('navLogoutBtn')
    const popup     = document.getElementById('navLogoutPopup')
    const confirmBtn = document.getElementById('popupConfirm')
    const cancelBtn  = document.getElementById('popupCancel')
    if (!logoutBtn || !popup) return

    let hideTimer = null

    function showPopup() {
      clearTimeout(hideTimer)
      popup.classList.add('visible')
    }
    function hidePopup() {
      hideTimer = setTimeout(() => popup.classList.remove('visible'), 150)
    }

    logoutBtn.onclick = (e) => { e.stopPropagation(); showPopup() }
    confirmBtn.onclick = (e) => {
      e.stopPropagation()
      popup.classList.remove('visible')
      window._handleLogout?.()
    }
    cancelBtn.onclick = (e) => { e.stopPropagation(); hidePopup() }

    // 点击其他地方关闭
    document.addEventListener('click', hidePopup)
    // 鼠标离开整个包裹区域时延迟关闭
    const wrap = logoutBtn.parentElement
    wrap.onmouseleave = () => hidePopup()
    wrap.onmouseenter = () => clearTimeout(hideTimer)
  }, 0)
}

// 退出后恢复
window.resetNavUser = function () {
  const area = document.getElementById('navUserArea')
  if (!area) return
  area.innerHTML = `
    <button class="nav-login-btn" onclick="renderApp('login');return false;">登录</button>
    <button class="nav-register-btn" onclick="window._goRegister?.();return false;">注册</button>
  `
}
