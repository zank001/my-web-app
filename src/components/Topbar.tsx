import { Bell, Search } from 'lucide-react'
import { useStore } from '../data/store'
import type { Page } from './Sidebar'

export default function Topbar({
  currentUserId,
  onNavigate,
}: { currentUserId: string; onNavigate: (p: Page) => void }) {
  const user = useStore((s) => s.users.find((u) => u.id === currentUserId))
  const dept = useStore((s) => s.departments.find((d) => d.id === user?.departmentId))
  const pending = useStore((s) =>
    s.distributions.flatMap((d) => d.recipients).filter((r) => r.status === 'pending' || r.status === 'overdue').length,
  )

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <div className="relative max-w-md flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="ค้นหารหัสเอกสาร, ชื่อ, แท็ก…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <button
        onClick={() => onNavigate('inbox')}
        className="relative grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
        title="การแจ้งเตือน"
      >
        <Bell size={18} />
        {pending > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {pending}
          </span>
        )}
      </button>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white py-1.5 pl-2 pr-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
          {user?.name.slice(0, 1)}
        </div>
        <div className="leading-tight">
          <div className="text-xs font-semibold">{user?.name}</div>
          <div className="text-[11px] text-slate-500">
            {dept?.nameTh} · {roleLabel(user?.role)}
          </div>
        </div>
      </div>
    </header>
  )
}

const roleLabel = (r?: string) =>
  r === 'qmr' ? 'QMR'
  : r === 'dept_head' ? 'หัวหน้าหน่วย'
  : r === 'admin' ? 'ผู้ดูแลระบบ'
  : 'เจ้าหน้าที่'
