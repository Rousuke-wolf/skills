// 统一 API 客户端 — 自动带 JWT token
const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

export async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.message || `请求失败 (${res.status})`)
    err.status = res.status
    throw err
  }

  return data
}

// ── 认证接口 ──
export const authAPI = {
  sendCode:       (body) => api('POST', '/auth/send-code', body),
  register:       (body) => api('POST', '/auth/register', body),
  login:          (body) => api('POST', '/auth/login', body),
  resetPassword:  (body) => api('POST', '/auth/reset-password', body),
  changePassword: (body) => api('POST', '/auth/change-password', body),
  me:             ()    => api('GET',  '/auth/me'),
}
