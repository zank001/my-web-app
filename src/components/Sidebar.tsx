import {
  BarChart3, BookOpenCheck, ClipboardCheck, FilePlus2, FileText,
  Inbox as InboxIcon, LayoutDashboard, LogOut, PenLine, Send, ShieldCheck,
} from 'lucide-react'
import { useStore } from '../data/store'
import { canSeePage, roleColor, roleLabel } from '../lib/permissions'

export type Page =
  | 'dashboard' | 'register' | 'request' | 'studio' | 'approvals'
  | 'distribution' | 'inbox' | 'reports' | 'manual'

export default function Sidebar({
  current, onNavigate, onSignOut,
}: { current: Page; onNavigate: (p: Page) => void; onSignOut: () => void }) {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))
  const requests = useStore((s) => s.requests)
  const pendingRequests = requests.filter((r) => r.status === 'submitted' || r.status === 'reviewed').length

  const items: Array<{ key: Page; label: string; icon: typeof FileText; hint?: number }> = [
    { key: 'dashboard',    label: 'แดชบอร์ด',                icon: LayoutDashboard },
    { key: 'register',     label: 'บัญชีเอกสารคุณภาพ',       icon: FileText },
    { key: 'request',      label: 'ขอขึ้นทะเบียน/แก้ไข',     icon: FilePlus2 },
    { key: 'studio',       label: 'สตูดิโอช่วยร่างเอกสาร',    icon: PenLine },
    { key: 'approvals',    label: 'ตรวจสอบ & อนุมัติ',       icon: ClipboardCheck, hint: pendingRequests },
    { key: 'distribution', label: 'การแจกจ่ายเอกสาร',        icon: Send },
    { key: 'inbox',        label: 'กล่องรับเอกสาร',          icon: InboxIcon },
    { key: 'reports',      label: 'รายงาน & ตรวจสอบ',        icon: BarChart3 },
    { key: 'manual',       label: 'คู่มือระบบ (QM-QMR-001)', icon: BookOpenCheck },
  ]

  const visible = me ? items.filter((it) => canSeePage(me.role, it.key)) : items

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">ศูนย์คุณภาพ รพ.ปาย</div>
          <div className="text-xs text-slate-500">ระบบควบคุมเอกสารคุณภาพ</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 scrollbar-thin">
        {visible.map(({ key, label, icon: Icon, hint }) => {
          const active = current === key
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={
                'mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ' +
                (active
                  ? 'bg-brand-50 font-semibold text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
              }
            >
              <Icon size={18} className={active ? 'text-brand-600' : 'text-slate-500'} />
              <span className="flex-1 text-left">{label}</span>
              {hint ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  {hint}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        {me && (
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className="truncate text-xs font-semibold text-slate-700">{me.name}</div>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColor[me.role]}`}>
              {roleLabel[me.role]}
            </span>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={18} className="text-slate-500" />
          ออกจากระบบ
        </button>
        <div className="px-3 pt-3 text-[10px] leading-relaxed text-slate-400">
          อ้างอิง QM-QMR-001-1<br />การจัดทำและควบคุมเอกสารคุณภาพ
        </div>
      </div>
    </aside>
  )
}
