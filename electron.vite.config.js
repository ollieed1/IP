import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { minify: true }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { minify: true }
  },
  renderer: {
    plugins: [react()],
    build: { minify: true }
  }
})
