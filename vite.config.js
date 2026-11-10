import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_PORT = process.env.PORT || 8787

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/ws': { target: `ws://localhost:${SERVER_PORT}`, ws: true },
      '/health': { target: `http://localhost:${SERVER_PORT}` },
    },
  },
})
