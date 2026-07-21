import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // ── 后端 API（用户系统）────────────────────────
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // ── TTS 语音合成（本地 Express）─────────────────
      '/tts': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // ── 阿里云 TTS 代理（备用）─────────────────────
      '/tts-api': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts-api/, ''),
      },
      // ── 阿里云 图片生成 代理 ──────────────────────
      "/image-api": {
        target: "https://dashscope.aliyuncs.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/image-api/, "")
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
        rewrite: (path) => {
          const url = new URL('http://dummy' + path).searchParams.get('url')
          return url ? new URL(url).pathname + new URL(url).search : path
        }
      }
    }
  }
})
