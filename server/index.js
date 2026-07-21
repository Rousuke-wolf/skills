import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import ttsRoutes from './routes/tts.js'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// ── 中间件 ──────────────────────────────────────────
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// ── API 路由 ────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/tts', ttsRoutes)

// ── 健康检查 + SMTP 测试 ────────────────────────────
import { testSmtpConnection } from './utils/email.js'

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/debug/smtp-test', async (req, res) => {
  const result = await testSmtpConnection()
  res.json({ ...result, devMode: process.env.DEV_MODE === 'true' })
})

// ── 数据备份 ──
import { manualBackup, listBackups } from './db.js'

app.post('/api/admin/backup', (req, res) => {
  const result = manualBackup()
  res.json(result)
})

app.get('/api/admin/backups', (req, res) => {
  res.json({ backups: listBackups() })
})

// ── 生产环境：托管前端静态文件 ──────────────────────
const distPath = join(__dirname, '..', 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  // SPA fallback：非 API 请求全部返回 index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/tts')) return next()
    res.sendFile(join(distPath, 'index.html'))
  })
}

// ── 404（仅开发模式走到这里）─────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' })
})

// ── 全局错误处理 ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] 未捕获错误:', err)
  res.status(500).json({ message: '服务器内部错误' })
})

// ── 启动 ────────────────────────────────────────────
async function start() {
  try {
    await initDB()
    app.listen(PORT, () => {
      console.log(`✅ 后端服务已启动: http://localhost:${PORT}`)
      console.log(`   POST /api/auth/register — 注册`)
      console.log(`   POST /api/auth/login    — 登录`)
      console.log(`   GET  /api/auth/me       — 用户信息`)
      console.log(`   POST /tts               — TTS 语音`)
    })
  } catch (err) {
    console.error('❌ 服务启动失败:', err)
    process.exit(1)
  }
}

start()
