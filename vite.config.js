import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
    // 核心：添加代理配置
    server: {
        proxy: {
            // 匹配所有以 /api 开头的请求路径
            '/api': {
                target: 'http://localhost:3000', // 👉 替换为你的后端服务地址（必填，如后端端口是3000）
                changeOrigin: true, // 开启跨域模拟（关键，解决跨域问题）
                // rewrite: (path) => path.replace(/^\/api/, '') // 可选：若后端接口没有 /api 前缀，需要开启此配置（删除前端请求的 /api 前缀）
                // 示例：若后端接口是 http://localhost:3000/ini/save，而非 /api/ini/save，则开启 rewrite
            }
        }
    }
})
