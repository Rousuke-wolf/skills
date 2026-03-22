import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      // 把 /tts-api 代理到阿里云，解决 CORS 问题
      '/tts-api': {
        target: 'https://dashscope.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts-api/, ''),
      }
    }
  }
})