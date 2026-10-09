import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer'),
  base: '/iptv/',
  build: {
    outDir: resolve(__dirname, 'web-dist'),
    emptyOutDir: true,
  },
})
