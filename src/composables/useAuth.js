import { ref } from 'vue'
import { authAPI } from '../api/client.js'

// 全局单例状态（跨组件共享）
const user = ref(null)
const isLoggedIn = ref(false)
const loading = ref(true)

function _syncNavbar(username) {
  if (typeof window.updateNavUser === 'function') {
    window.updateNavUser(username)
  }
}
function _resetNavbar() {
  if (typeof window.resetNavUser === 'function') {
    window.resetNavUser()
  }
}

// 本地缓存（后端不可用时也能保持登录态）
const CACHE_KEY = 'auth_cache'

function _saveCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}
function _loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function _clearCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem('token')
}

export function useAuth() {
  async function login(email, credential, mode = 'password') {
    const body = mode === 'code'
      ? { email, code: credential, mode: 'code' }
      : { email, password: credential }
    const data = await authAPI.login(body)
    localStorage.setItem('token', data.token)
    _saveCache({ username: data.user.username, email: data.user.email, avatar: data.user.avatar })
    user.value = data.user
    isLoggedIn.value = true
    _syncNavbar(data.user.username)
    return data.user
  }

  async function register(username, email, password, code) {
    const data = await authAPI.register({ username, email, password, code })
    localStorage.setItem('token', data.token)
    _saveCache({ username: data.user.username, email: data.user.email, avatar: data.user.avatar })
    user.value = data.user
    isLoggedIn.value = true
    _syncNavbar(data.user.username)
    return data.user
  }

  async function checkAuth() {
    loading.value = true
    const token = localStorage.getItem('token')
    if (!token) {
      loading.value = false
      return
    }
    try {
      // 尝试从后端验证 token 是否有效
      const data = await authAPI.me()
      user.value = data.user
      isLoggedIn.value = true
      _saveCache({ username: data.user.username, email: data.user.email, avatar: data.user.avatar })
      _syncNavbar(data.user.username)
    } catch {
      // 后端不可用 → 从本地缓存恢复
      const cache = _loadCache()
      if (cache?.username) {
        console.log('[auth] 后端不可用，从本地缓存恢复登录态')
        user.value = { username: cache.username, email: cache.email, avatar: cache.avatar }
        isLoggedIn.value = true
        _syncNavbar(cache.username)
      } else {
        // 无缓存 → 退出
        _clearCache()
      }
    } finally {
      loading.value = false
    }
  }

  function logout() {
    _clearCache()
    user.value = null
    isLoggedIn.value = false
    _resetNavbar()
  }

  return { user, isLoggedIn, loading, login, register, checkAuth, logout }
}

// ── 全局退出处理 ──
window._handleLogout = function () {
  const auth = useAuth()
  auth.logout()
}

// ── 全局注册跳转 ──
window._goRegister = function () {
  if (window.__vueRouter) {
    window.__vueRouter.push('/login?mode=register')
  }
}
