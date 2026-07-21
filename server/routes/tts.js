import { Router } from 'express'
import { WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

const router = Router()

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference'
const API_KEY = process.env.DASHSCOPE_TTS_KEY || 'sk-77aee8a61cab46a18ab2ba7487223716'
const DEFAULT_VOICE = 'longling_v2'
const MODEL = 'cosyvoice-v2'

router.post('/', (req, res) => {
  const { text, volume, rate, voice } = req.body

  if (!text?.trim()) {
    return res.status(400).json({ message: '文本不能为空' })
  }

  const useVolume = (volume !== undefined) ? Number(volume) : 50
  const useRate = (rate !== undefined) ? Number(rate) : 1.2
  const useVoice = (voice !== undefined) ? String(voice) : DEFAULT_VOICE
  const taskId = randomUUID()

  const ws = new WebSocket(WS_URL, {
    headers: { Authorization: `bearer ${API_KEY}` }
  })

  ws.on('open', () => {
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    })

    ws.send(JSON.stringify({
      header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
      payload: {
        task_group: 'audio',
        task: 'tts',
        function: 'SpeechSynthesizer',
        model: MODEL,
        parameters: {
          voice: useVoice,
          format: 'mp3',
          sample_rate: 22050,
          volume: useVolume,
          rate: useRate,
          pitch: 1.0
        },
        input: {}
      }
    }))

    ws.send(JSON.stringify({
      header: { action: 'continue-task', task_id: taskId },
      payload: { input: { text } }
    }))

    ws.send(JSON.stringify({
      header: { action: 'finish-task', task_id: taskId },
      payload: { input: {} }
    }))
  })

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      res.write(data)
    } else {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.header?.event === 'task-failed') {
          console.error('[TTS] 失败:', msg.header.error_code, msg.header.error_message)
        }
      } catch { /* ignore parse errors */ }
    }
  })

  ws.on('close', () => res.end())
  ws.on('error', (err) => {
    console.error('[TTS] WebSocket 错误:', err.message)
    if (!res.headersSent) res.status(500).json({ message: 'TTS 服务异常' })
    else res.end()
  })
})

export default router
