import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Sidebar, { type Page } from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Upload from './pages/Upload'
import Distribution from './pages/Distribution'
import Inbox from './pages/Inbox'
import Reports from './pages/Reports'
import Login from './pages/Login'
import { useStore } from './data/store'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const currentUserId = useStore((s) => s.currentUserId)
  const [authed, setAuthed] = useState(true) // demo: pre-authed; toggle to show Login

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  const render = () => {
    switch (page) {
      case 'dashboard':    return <Dashboard onNavigate={setPage} />
      case 'documents':    return <Documents />
      case 'upload':       return <Upload onDone={() => setPage('distribution')} />
      case 'distribution': return <Distribution />
      case 'inbox':        return <Inbox />
      case 'reports':      return <Reports />
      default:             return null
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <Sidebar current={page} onNavigate={setPage} onSignOut={() => setAuthed(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar currentUserId={currentUserId} onNavigate={setPage} />
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
