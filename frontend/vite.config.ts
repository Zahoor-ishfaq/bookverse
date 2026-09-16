import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Dev proxies keep Gutendex + Gutenberg requests same-origin so the reader
// can stream raw book text without CORS surprises.
const proxy = {
  '/api': { target: 'http://localhost:8000', changeOrigin: true, ws: true },
  '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
}

export default defineConfig({
  plugins: [react()],
  preview: { port: 4173, proxy },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy },
})
