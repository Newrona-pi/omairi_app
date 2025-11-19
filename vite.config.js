import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 環境変数を読み込む
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    // 環境変数VITE_BASE_PATHが設定されている場合はそれを使用、なければ/omairi_app/（GitHub Pages用）
    base: env.VITE_BASE_PATH || '/omairi_app/',
  }
})
