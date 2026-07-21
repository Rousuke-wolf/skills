import { Router } from 'express'
import crypto from 'crypto'
import { query } from '../db.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { sendVerificationCode, testSmtpConnection, isEmailAvailable } from '../utils/email.js'

const router = Router()

// ── 开发模式 ──
const DEV_MODE = process.env.DEV_MODE === 'true'

// ── 发送验证码限流（内存，同邮箱 60 秒一次）──
const codeRateLimit = new Map()
setInterval(() => {
  const now = Date.now()
  for (const [key, time] of codeRateLimit) {
    if (now - time > 60_000) codeRateLimit.delete(key)
  }
}, 30_000)

function checkRateLimit(email) {
  const last = codeRateLimit.get(email)
  if (last && Date.now() - last < 60_000) {
    const remain = Math.ceil((60_000 - (Date.now() - last)) / 1000)
    return { limited: true, remain }
  }
  codeRateLimit.set(email, Date.now())
  return { limited: false }
}

// 统一：校验并消费验证码，返回 true/false
async function verifyCode(email, code) {
  const [rows] = await query(
    'SELECT id FROM email_verifications WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime(\'now\') ORDER BY id DESC LIMIT 1',
    [email.trim(), code]
  )
  if (rows.length === 0) return false
  await query('UPDATE email_verifications SET used = 1 WHERE id = ?', [rows[0].id])
  return true
}

// ── POST /api/auth/send-code ──────────────────────
// purpose: 'register' | 'login'
router.post('/send-code', async (req, res) => {
  try {
    const { email, purpose } = req.body

    if (!email?.trim()) {
      return res.status(400).json({ message: '邮箱不能为空' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' })
    }

    // 限流检查
    const rate = checkRateLimit(email.trim())
    if (rate.limited) {
      return res.status(429).json({ message: `请 ${rate.remain} 秒后再发送验证码` })
    }

    // 根据用途检查邮箱存在性
    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.trim()])
    if (purpose === 'register' && existing.length > 0) {
      return res.status(409).json({ message: '该邮箱已被注册，请直接登录' })
    }
    if (purpose === 'login' && existing.length === 0) {
      return res.status(404).json({ message: '该邮箱未注册，请先创建账号' })
    }
    if (purpose === 'reset' && existing.length === 0) {
      return res.status(404).json({ message: '该邮箱未注册，请先创建账号' })
    }

    // 生成 6 位数字验证码
    const code = String(crypto.randomInt(100000, 999999))

    // 5 分钟有效
    await query(
      "INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, datetime('now', '+5 minutes'))",
      [email.trim(), code]
    )

    // ── 发送邮件 ──
    let emailSent = false
    let emailError = null

    if (isEmailAvailable() && !DEV_MODE) {
      try {
        await sendVerificationCode(email.trim(), code)
        emailSent = true
      } catch (err) {
        emailError = err.message
        console.error('[auth] 邮件发送失败:', emailError)
      }
    }

    if (DEV_MODE) {
      console.log(`[auth] 🔧 开发模式 — 验证码 (${purpose}): ${email.trim()} → ${code}`)
      return res.json({
        message: '验证码已发送，请查收邮件（5 分钟内有效）',
        devCode: code,   // 开发模式：前端可直接展示
      })
    }

    if (emailSent) {
      console.log(`[auth] 验证码已发送 (${purpose}): ${email.trim()} → ${code}`)
      return res.json({ message: '验证码已发送，请查收邮件（5 分钟内有效）' })
    }

    // 邮件发送失败 — 返回详细错误 + 开发模式代码
    console.log(`[auth] 📝 邮件发送失败，验证码 (${purpose}): ${email.trim()} → ${code}`)
    const errMsg = emailError || '邮件服务未配置'
    res.status(500).json({
      message: `邮件发送失败: ${errMsg}`,
      hint: '你可以开启开发模式：在 .env 中设置 DEV_MODE=true，验证码将直接显示在页面中',
    })
  } catch (err) {
    console.error('[auth] 发送验证码失败:', err)
    res.status(500).json({ message: '发送验证码失败，请稍后重试' })
  }
})

// ── POST /api/auth/register ────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, code } = req.body

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码不能为空' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '密码至少 6 位' })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' })
    }
    if (username.trim().length < 2) {
      return res.status(400).json({ message: '用户名至少 2 个字符' })
    }

    // 验证码校验（邮件服务已配置时强制要求）
    if (isEmailAvailable()) {
      if (!code || code.length !== 6) {
        return res.status(400).json({ message: '请输入 6 位邮箱验证码' })
      }
      const ok = await verifyCode(email, code)
      if (!ok) {
        return res.status(400).json({ message: '验证码无效或已过期，请重新获取' })
      }
    }

    // 检查重复
    const [existing] = await query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email.trim(), username.trim()]
    )
    if (existing.length > 0) {
      return res.status(409).json({ message: '用户名或邮箱已被注册' })
    }

    const hashed = await hashPassword(password)
    const [result] = await query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username.trim(), email.trim(), hashed]
    )

    const user = {
      id: result.insertId,
      username: username.trim(),
      email: email.trim(),
      role: 'user',
    }
    const token = signToken(user)

    res.status(201).json({ token, user })
  } catch (err) {
    console.error('[auth] 注册失败:', err)
    res.status(500).json({ message: '服务器错误，请稍后重试' })
  }
})

// ── POST /api/auth/login ───────────────────────────
// mode: 'password'（默认）| 'code'（验证码登录）
router.post('/login', async (req, res) => {
  try {
    const { email, password, code, mode } = req.body

    if (!email?.trim()) {
      return res.status(400).json({ message: '邮箱不能为空' })
    }

    // 验证码登录
    if (mode === 'code') {
      if (!isEmailAvailable()) {
        return res.status(503).json({ message: '邮件服务未配置，暂不支持验证码登录' })
      }
      if (!code || code.length !== 6) {
        return res.status(400).json({ message: '请输入 6 位验证码' })
      }
      const ok = await verifyCode(email, code)
      if (!ok) {
        return res.status(400).json({ message: '验证码无效或已过期，请重新获取' })
      }
      // 验证码通过，直接登录
      const [rows] = await query(
        'SELECT id, username, email, avatar, role FROM users WHERE email = ?',
        [email.trim()]
      )
      if (rows.length === 0) {
        return res.status(404).json({ message: '该邮箱未注册' })
      }
      const user = rows[0]
      const token = signToken(user)
      return res.json({ token, user })
    }

    // 密码登录（默认）
    if (!password) {
      return res.status(400).json({ message: '请输入密码' })
    }

    const [rows] = await query(
      'SELECT id, username, email, password, avatar, role FROM users WHERE email = ?',
      [email.trim()]
    )
    if (rows.length === 0) {
      return res.status(401).json({ message: '邮箱或密码不正确' })
    }

    const u = rows[0]
    const valid = await comparePassword(password, u.password)
    if (!valid) {
      return res.status(401).json({ message: '邮箱或密码不正确' })
    }

    const user = { id: u.id, username: u.username, email: u.email, avatar: u.avatar, role: u.role }
    const token = signToken(user)
    res.json({ token, user })
  } catch (err) {
    console.error('[auth] 登录失败:', err)
    res.status(500).json({ message: '服务器错误，请稍后重试' })
  }
})

// ── POST /api/auth/reset-password ──────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body

    if (!email?.trim() || !password || !code) {
      return res.status(400).json({ message: '邮箱、验证码和新密码不能为空' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '新密码至少 6 位' })
    }
    if (code.length !== 6) {
      return res.status(400).json({ message: '请输入 6 位验证码' })
    }

    // 校验验证码
    if (isEmailAvailable()) {
      const ok = await verifyCode(email, code)
      if (!ok) {
        return res.status(400).json({ message: '验证码无效或已过期，请重新获取' })
      }
    }

    // 更新密码
    const hashed = await hashPassword(password)
    const [result] = await query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashed, email.trim()]
    )
    if (result.changes === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }

    res.json({ message: '密码已重置，请使用新密码登录' })
  } catch (err) {
    console.error('[auth] 重置密码失败:', err)
    res.status(500).json({ message: '服务器错误，请稍后重试' })
  }
})

// ── POST /api/auth/change-password ─────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: '旧密码和新密码不能为空' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: '新密码至少 6 位' })
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: '新密码不能与旧密码相同' })
    }

    // 验证旧密码
    const [rows] = await query('SELECT password FROM users WHERE id = ?', [req.user.id])
    if (rows.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    const valid = await comparePassword(oldPassword, rows[0].password)
    if (!valid) {
      return res.status(400).json({ message: '旧密码不正确' })
    }

    // 更新密码
    const hashed = await hashPassword(newPassword)
    await query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id])

    res.json({ message: '密码修改成功' })
  } catch (err) {
    console.error('[auth] 修改密码失败:', err)
    res.status(500).json({ message: '服务器错误，请稍后重试' })
  }
})

// ── GET /api/auth/me ───────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await query(
      'SELECT id, username, email, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    res.json({ user: rows[0] })
  } catch (err) {
    console.error('[auth] 获取用户信息失败:', err)
    res.status(500).json({ message: '服务器错误' })
  }
})

export default router
