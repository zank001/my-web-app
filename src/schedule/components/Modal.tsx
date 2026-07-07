import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'

export default function Modal({
  open, onClose, title, children, maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <motion.div
            className={`w-full ${maxWidth} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16 }}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            </header>
            <div className="max-h-[75vh] overflow-y-auto scrollbar-thin p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
