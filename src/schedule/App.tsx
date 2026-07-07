import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock, Download,
  Eraser, Loader2, Sparkles, Users, Wand2,
} from 'lucide-react'
import { actions, getState, useSchedule } from './store'
import { addDays, formatWeekRange, startOfWeek, todayISO, weekDates } from './lib/date'
import { autoSchedule } from './lib/autoSchedule'
import { exportRosterXlsx } from './lib/excel'
import RosterGrid from './components/RosterGrid'
import StaffManager from './components/StaffManager'
import ShiftManager from './components/ShiftManager'
import AiAssistant from './components/AiAssistant'

// โหลดแยก — หน้าสถิติดึง recharts ที่ขนาดใหญ่ เข้ามาเฉพาะเมื่อเปิดแท็บนี้
const Analytics = lazy(() => import('./components/Analytics'))

type Tab = 'roster' | 'analytics' | 'staff' | 'shifts'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'roster', label: 'ตารางเวร', icon: <CalendarDays size={16} /> },
  { id: 'analytics', label: 'สถิติ / วิเคราะห์', icon: <BarChart3 size={16} /> },
  { id: 'staff', label: 'บุคลากร', icon: <Users size={16} /> },
  { id: 'shifts', label: 'ประเภทเวร', icon: <Clock size={16} /> },
]

export default function App() {
  const weekStart = useSchedule((s) => s.weekStart)
  const staff = useSchedule((s) => s.staff)
  const shifts = useSchedule((s) => s.shifts)
  const [tab, setTab] = useState<Tab>('roster')
  const [aiOpen, setAiOpen] = useState(false)
  const [toast, setToast] = useState('')

  const dates = useMemo(() => weekDates(weekStart), [weekStart])

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3500)
  }

  const runAutoFill = () => {
    const { assignments, unfilled } = autoSchedule(dates, shifts, staff, getState().assignments, { keepExisting: true })
    actions.mergeAssignments(assignments)
    flash(unfilled === 0 ? 'จัดเวรอัตโนมัติครบทุกช่องแล้ว' : `จัดเวรอัตโนมัติแล้ว — ยังขาดอีก ${unfilled} ตำแหน่ง (คนไม่พอ/ติดวันลา)`)
  }

  const clearWeek = () => {
    if (confirm('ล้างการจัดเวรทั้งหมดของสัปดาห์นี้?')) {
      actions.clearDates(dates)
      flash('ล้างเวรของสัปดาห์นี้แล้ว')
    }
  }

  const exportExcel = () => {
    flash('กำลังเตรียมไฟล์ Excel…')
    exportRosterXlsx(weekStart, dates, shifts, staff, getState().assignments)
      .catch(() => flash('ส่งออกไฟล์ไม่สำเร็จ'))
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-6 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
            <CalendarDays size={22} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold leading-tight">จัดตารางเวรบุคลากร</div>
            <div className="text-xs text-slate-500">โรงพยาบาลปาย · จัดเวร วิเคราะห์ความเป็นธรรม และส่งออก Excel</div>
          </div>
          <button
            onClick={() => setAiOpen(true)}
            className="hidden items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 sm:inline-flex"
          >
            <Sparkles size={16} /> ผู้ช่วย AI
          </button>
        </div>
      </header>

      {/* แถบเครื่องมือ: เลื่อนสัปดาห์ + ปุ่มจัดการ */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 px-6 py-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
            <IconBtn onClick={() => actions.setWeekStart(addDays(weekStart, -7))} label="สัปดาห์ก่อน"><ChevronLeft size={18} /></IconBtn>
            <button
              onClick={() => actions.setWeekStart(startOfWeek(todayISO()))}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              สัปดาห์นี้
            </button>
            <IconBtn onClick={() => actions.setWeekStart(addDays(weekStart, 7))} label="สัปดาห์ถัดไป"><ChevronRight size={18} /></IconBtn>
          </div>
          <div className="mr-auto text-sm font-semibold text-slate-700">{formatWeekRange(weekStart)}</div>

          <ToolBtn onClick={runAutoFill} icon={<Wand2 size={16} />}>จัดเวรอัตโนมัติ</ToolBtn>
          <ToolBtn onClick={() => setAiOpen(true)} icon={<Sparkles size={16} />} className="sm:hidden">AI</ToolBtn>
          <ToolBtn onClick={exportExcel} icon={<Download size={16} />}>ส่งออก Excel</ToolBtn>
          <ToolBtn onClick={clearWeek} icon={<Eraser size={16} />} danger>ล้างสัปดาห์</ToolBtn>
        </div>
      </div>

      {/* แท็บ */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto scrollbar-thin px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            {tab === 'roster' && <RosterGrid dates={dates} />}
            {tab === 'analytics' && (
              <Suspense fallback={<div className="grid place-items-center py-24 text-slate-300"><Loader2 className="animate-spin" /></div>}>
                <Analytics dates={dates} />
              </Suspense>
            )}
            {tab === 'staff' && <StaffManager />}
            {tab === 'shifts' && <ShiftManager />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-6 py-3 text-[11px] leading-relaxed text-slate-400">
          ข้อมูลบันทึกไว้ในเบราว์เซอร์นี้ (localStorage) — เหมาะสำหรับการจัดเวรภายในหน่วยงาน
          การจัดเวรอัตโนมัติเป็นเพียงข้อเสนอเริ่มต้น หัวหน้าเวรควรตรวจทานก่อนใช้จริง
        </div>
      </footer>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {aiOpen && <AiAssistant dates={dates} onClose={() => setAiOpen(false)} />}
    </div>
  )
}

function IconBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
      {children}
    </button>
  )
}

function ToolBtn({
  onClick, icon, children, danger, className = '',
}: {
  onClick: () => void; icon: React.ReactNode; children: React.ReactNode; danger?: boolean; className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        danger
          ? 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      } ${className}`}
    >
      {icon} {children}
    </button>
  )
}
