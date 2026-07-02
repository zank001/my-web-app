import type { ReactNode } from 'react'

export default function Card({
  title, action, children, className = '',
}: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <div>{action}</div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}
