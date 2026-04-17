import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // ── 原有：阿里云 TTS 代理 ──────────────────────
      '/tts-api': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts-api/, ''),
      },

      // ── 新增：Meshy API 代理（提交任务 / 查询进度）──
      '/meshy-api': {
        target: 'https://api.meshy.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/meshy-api/, ''),
      },

      // ── 新增：Meshy GLB 文件代理（解决模型加载跨域）──
      '/meshy-glb': {
        target: 'https://assets.meshy.ai',
        changeOrigin: true,
        bypass(req, res) {
          const rawUrl = new URL(req.url, 'http://localhost').searchParams.get('url')
          if (!rawUrl) { res.statusCode = 400; res.end('Missing url param'); return false }
          if (!rawUrl.startsWith('https://assets.meshy.ai/')) {
            res.statusCode = 403; res.end('Forbidden'); return false
          }
          const https = require('https')
          const urlObj = new URL(rawUrl)
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', 'model/gltf-binary')
          https.get(
            { hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search },
            upstream => { res.statusCode = upstream.statusCode; upstream.pipe(res) }
          ).on('error', e => { res.statusCode = 500; res.end(e.message) })
          return false
        }
      },
    }
  }
})