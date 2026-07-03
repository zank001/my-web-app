import { lazy, Suspense, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import Sidebar, { type Page } from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import RequestForm from './pages/RequestForm'
import Approvals from './pages/Approvals'

// โหลดแยก — สตูดิโอดึง docx + Anthropic SDK ที่ขนาดใหญ่ เข้ามาเฉพาะเมื่อเปิดใช้
const Studio = lazy(() => import('./pages/Studio'))
import Distribution from './pages/Distribution'
import Inbox from './pages/Inbox'
import Reports from './pages/Reports'
import Manual from './pages/Manual'
import Login from './pages/Login'
import { actions, useStore } from './data/store'
import { canSeePage } from './lib/permissions'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [query, setQuery] = useState('')
  const currentUserId = useStore((s) => s.currentUserId)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  if (!currentUserId || !me) return <Login />

  // กันเส้นทาง: ถ้าระดับผู้ใช้ไม่มีสิทธิ์เห็นหน้านี้ ให้กลับแดชบอร์ด
  const activePage: Page = canSeePage(me.role, page) ? page : 'dashboard'

  const render = () => {
    switch (activePage) {
      case 'dashboard':    return <Dashboard onNavigate={setPage} />
      case 'register':     return <Register query={query} onQuery={setQuery} />
      case 'request':      return <RequestForm onDone={() => setPage(canSeePage(me.role, 'approvals') ? 'approvals' : 'register')} />
      case 'studio':       return (
        <Suspense fallback={<div className="grid place-items-center py-24 text-slate-400"><Loader2 className="animate-spin" /></div>}>
          <Studio onDone={() => setPage(canSeePage(me.role, 'approvals') ? 'approvals' : 'register')} />
        </Suspense>
      )
      case 'approvals':    return <Approvals />
      case 'distribution': return <Distribution />
      case 'inbox':        return <Inbox />
      case 'reports':      return <Reports />
      case 'manual':       return <Manual />
      default:             return null
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar current={activePage} onNavigate={setPage} onSignOut={() => actions.logout()} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onNavigate={setPage} query={query} onQuery={setQuery} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mx-auto w-full max-w-7xl p-6"
            >
              {render()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
