import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // หลายเว็บแยกกันใน repo เดียว: ระบบเอกสาร QMR (root), ผู้ช่วยข้อมูลยา AI (/drugai/),
  // แอปจัดตารางเวรบุคลากร (/schedule/), แอปบริหารการเงิน MoneyMap (/moneymap/)
  // และแอปวิเคราะห์สถิติแบบ Stata (/stata/)
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        drugai: fileURLToPath(new URL('./drugai/index.html', import.meta.url)),
        schedule: fileURLToPath(new URL('./schedule/index.html', import.meta.url)),
        moneymap: fileURLToPath(new URL('./moneymap/index.html', import.meta.url)),
        stata: fileURLToPath(new URL('./stata/index.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})
