import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App'

// Sandbox บางสภาพแวดล้อมปิด HMR ทำให้ Vite client ล้มด้วย unhandled rejection
// "WebSocket closed without opened" ซึ่งไม่กระทบผู้ใช้ — ดักไว้ไม่ให้รก console
window.addEventListener('unhandledrejection', (event) => {
  const reason: unknown = event.reason
  const message = typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : ''
  if (message.includes('WebSocket closed without opened')) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
