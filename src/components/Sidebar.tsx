import {
  BarChart3, FileText, Inbox as InboxIcon, LayoutDashboard,
  LogOut, Send, ShieldCheck, Upload as UploadIcon,
} from 'lucide-react'

export type Page = 'dashboard' | 'documents' | 'upload' | 'distribution' | 'inbox' | 'reports'

const items: Array<{ key: Page; label: string; icon: typeof FileText; hint?: string }> = [
  { key: 'dashboard',    label: 'แดชบอร์ด',          icon: LayoutDashboard },
  { key: 'documents',    label: 'คลังเอกสาร',        icon: FileText },
  { key: 'upload',       label: 'อัปโหลด/สร้างใหม่',  icon: UploadIcon },
  { key: 'distribution', label: 'การจ่ายเอกสาร',     icon: Send },
  { key: 'inbox',        label: 'กล่องรับเอกสาร',    icon: InboxIcon, hint: '3' },
  { key: 'reports',      label: 'รายงาน & ตรวจสอบ', icon: BarChart3 },
]

export default function Sidebar({
  current, onNavigate, onSignOut,
}: { current: Page; onNavigate: (p: Page) => void; onSignOut: () => void }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">QMR Document</div>
          <div className="text-xs text-slate-500">ระบบส่งเอกสารคุณภาพ</div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {items.map(({ key, label, icon: Icon, hint }) => {
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
              {hint && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                  {hint}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut size={18} className="text-slate-500" />
          ออกจากระบบ
        </button>
        <div className="px-3 pt-3 text-[10px] text-slate-400">
          v0.1.0 · ISO 9001 / HA
        </div>
      </div>
    </aside>
  )
}
