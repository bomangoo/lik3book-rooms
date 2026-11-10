import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_PORT = process.env.PORT || 8787

export default defineConfig({
  // 상대 경로로 빌드해 GitHub Pages(/저장소이름/)나 루트 도메인 어디에 올려도 동작
  base: './',
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
      '/health': { target: `http://localhost:${SERVER_PORT}` },
    },
  },
})
