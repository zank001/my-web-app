import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar, { type Page } from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import RequestForm from './pages/RequestForm'
import Approvals from './pages/Approvals'
import Distribution from './pages/Distribution'
import Inbox from './pages/Inbox'
import Reports from './pages/Reports'
import Manual from './pages/Manual'
import Login from './pages/Login'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [authed, setAuthed] = useState(true) // โหมดสาธิต: ล็อกอินอัตโนมัติ
  const [query, setQuery] = useState('')

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  const render = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard onNavigate={setPage} />
      case 'register':     return <Register query={query} onQuery={setQuery} />
      case 'request':      return <RequestForm onDone={() => setPage('approvals')} />
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
      <Sidebar current={page} onNavigate={setPage} onSignOut={() => setAuthed(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onNavigate={setPage} query={query} onQuery={setQuery} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
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
