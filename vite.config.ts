import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 교우의 집 지도 — 천주교 교우 가게 지도
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, host: true },
  build: { outDir: 'dist', sourcemap: false, target: 'es2019' },
})
