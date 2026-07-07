import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CalendarDays, FileSpreadsheet, Loader2, Settings2, Pill } from 'lucide-react'
import type { AppSettings, Duty, Holiday, ShiftType, Staff } from './types'
import { loadData, saveData, genId, type RosterData } from './store'
import { generateAutoDuties } from './lib/autoSchedule'
import CalendarView from './components/CalendarView'
import DayScheduleModal from './components/DayScheduleModal'

// โหลดแยก — หน้าสรุปดึง ExcelJS ก้อนใหญ่ เข้ามาเฉพาะเมื่อเปิดแท็บนี้
const SummaryView = lazy(() => import('./components/SummaryView'))
const SettingsView = lazy(() => import('./components/SettingsView'))

type Tab = 'calendar' | 'summary' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar', label: 'ปฏิทินจัดเวร', icon: <CalendarDays size={16} /> },
  { id: 'summary', label: 'สรุปค่าตอบแทน', icon: <FileSpreadsheet size={16} /> },
  { id: 'settings', label: 'ตั้งค่าระบบ', icon: <Settings2 size={16} /> },
]

const FONT_SIZE_PX: Record<AppSettings['appearance']['fontSize'], number> = {
  small: 14, medium: 16, large: 18,
}

// สีเน้นของส่วนหัว/แท็บ ตามธีมที่เลือกในหน้าตั้งค่า
const THEME: Record<AppSettings['appearance']['themeColor'], { grad: string; text: string; ring: string }> = {
  sky: { grad: 'from-blue-600 to-indigo-600', text: 'text-indigo-700', ring: 'border-indigo-600' },
  emerald: { grad: 'from-emerald-600 to-teal-600', text: 'text-emerald-700', ring: 'border-emerald-600' },
  slate: { grad: 'from-slate-700 to-slate-900', text: 'text-slate-800', ring: 'border-slate-800' },
}

export default function App() {
  const [data, setData] = useState<RosterData>(() => loadData())
  const { staff, duties, holidays, settings } = data

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => data.settings.departments[0]?.id ?? '')
  const [dayModalDate, setDayModalDate] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('calendar')

  // บันทึกลง localStorage อัตโนมัติทุกครั้งที่ข้อมูลเปลี่ยน
  useEffect(() => { saveData(data) }, [data])

  // ถ้าหน่วยงานที่เลือกถูกลบ ให้กลับไปหน่วยงานแรก
  useEffect(() => {
    if (!settings.departments.some((d) => d.id === selectedDeptId)) {
      setSelectedDeptId(settings.departments[0]?.id ?? '')
    }
  }, [settings.departments, selectedDeptId])

  const theme = THEME[settings.appearance.themeColor] ?? THEME.sky

  // ---- ตัวช่วยแก้ไข state ----
  const patch = (p: Partial<RosterData>) => setData((prev) => ({ ...prev, ...p }))

  // ---- ปฏิทิน / เดือน ----
  const goPrevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const goNextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  // ---- เวรรายวัน ----
  const handleSaveDuty = (
    assignedStaffIds: string[],
    shiftId: ShiftType,
    times?: { oncallStart?: string; oncallEnd?: string; specialStart?: string; specialEnd?: string },
  ) => {
    if (!dayModalDate) return
    const newDuties: Duty[] = assignedStaffIds.map((staffId) => {
      const duty: Duty = { id: genId(), date: dayModalDate, staffId, shiftId, departmentId: selectedDeptId }
      if (shiftId === 'oncall') {
        duty.oncallStartTime = times?.oncallStart
        duty.oncallEndTime = times?.oncallEnd
      } else if (shiftId === 'special') {
        duty.specialStartTime = times?.specialStart
        duty.specialEndTime = times?.specialEnd
      }
      return duty
    })
    patch({ duties: [...duties, ...newDuties] })
  }

  const handleDeleteDuty = (dutyId: string) => {
    patch({ duties: duties.filter((d) => d.id !== dutyId) })
  }

  const handleAutoSchedule = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const deptStaff = staff.filter((s) => s.departmentId === selectedDeptId)
    const added = generateAutoDuties(year, month, deptStaff, holidays, settings, duties, selectedDeptId)
    if (added.length === 0) {
      alert(
        'ไม่มีเวรใหม่ที่จะจัด — ตรวจสอบว่าได้กำหนด “วันเวรประจำสัปดาห์” ให้บุคลากรในหน่วยงานนี้แล้ว\n' +
        '(ตั้งค่า → บุคลากร → เลือกวันประจำสัปดาห์ของแต่ละคน)',
      )
      return
    }
    patch({ duties: [...duties, ...added] })
    alert(`จัดตารางอัตโนมัติเรียบร้อย เพิ่มเวรใหม่ ${added.length} รายการในเดือนนี้`)
  }

  const handleClearMonth = () => {
    const prefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-`
    const target = duties.filter((d) => d.departmentId === selectedDeptId && d.date.startsWith(prefix))
    if (target.length === 0) return alert('เดือนนี้ยังไม่มีเวรของหน่วยงานที่เลือก')
    if (!confirm(`ล้างตารางเวรของหน่วยงานนี้ทั้งเดือน (${target.length} รายการ)?`)) return
    patch({ duties: duties.filter((d) => !(d.departmentId === selectedDeptId && d.date.startsWith(prefix))) })
  }

  // ---- ตั้งค่า / วันหยุด / บุคลากร ----
  const handleSaveSettings = (next: AppSettings) => patch({ settings: next })
  const handleUpdateHolidays = (next: Holiday[]) => patch({ holidays: next })

  const handleAddStaff = (input: Omit<Staff, 'id' | 'signature'>) => {
    const s: Staff = { ...input, id: genId(), signature: '' }
    patch({ staff: [...staff, s] })
  }
  const handleUpdateStaff = (id: string, fields: Partial<Staff>) => {
    patch({ staff: staff.map((s) => (s.id === id ? { ...s, ...fields } : s)) })
  }
  const handleDeleteStaff = (id: string) => {
    // ลบพนักงานและเวรทั้งหมดที่เกี่ยวข้อง
    patch({ staff: staff.filter((s) => s.id !== id), duties: duties.filter((d) => d.staffId !== id) })
  }

  const dept = useMemo(
    () => settings.departments.find((d) => d.id === selectedDeptId),
    [settings.departments, selectedDeptId],
  )

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-100 text-slate-900"
      style={{ fontSize: FONT_SIZE_PX[settings.appearance.fontSize] }}
    >
      <header className="border-b border-slate-200 bg-white no-print">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-6 py-3.5">
          <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${theme.grad} text-white shadow-sm`}>
            <Pill size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight font-display">ระบบจัดตารางเวร &amp; ค่าตอบแทนนอกเวลาราชการ</div>
            <div className="truncate text-xs text-slate-500">
              {settings.hospitalInfo.hospitalName} · {settings.hospitalInfo.departmentName}
              {dept ? ` · ${dept.name}` : ''}
            </div>
          </div>
          <nav className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  tab === t.id ? `bg-white shadow-sm ${theme.text}` : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] flex-1 p-6">
        {tab === 'calendar' && (
          <CalendarView
            currentDate={currentDate}
            staff={staff}
            duties={duties}
            holidays={holidays}
            settings={settings}
            selectedDeptId={selectedDeptId}
            onSelectDeptId={setSelectedDeptId}
            onOpenDayModal={setDayModalDate}
            onAutoSchedule={handleAutoSchedule}
            onClearMonth={handleClearMonth}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
          />
        )}

        {tab === 'summary' && (
          <Suspense fallback={<div className="grid place-items-center py-24 text-slate-300"><Loader2 className="animate-spin" /></div>}>
            <SummaryView
              currentDate={currentDate}
              staff={staff}
              duties={duties}
              holidays={holidays}
              settings={settings}
              selectedDeptId={selectedDeptId}
            />
          </Suspense>
        )}

        {tab === 'settings' && (
          <Suspense fallback={<div className="grid place-items-center py-24 text-slate-300"><Loader2 className="animate-spin" /></div>}>
            <SettingsView
              settings={settings}
              holidays={holidays}
              staff={staff}
              onSaveSettings={handleSaveSettings}
              onUpdateHolidays={handleUpdateHolidays}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
            />
          </Suspense>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white no-print">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-3 text-[11px] leading-relaxed text-slate-400">
          ข้อมูลทั้งหมดบันทึกไว้ในเบราว์เซอร์นี้ (localStorage) — เหมาะสำหรับจัดเวรและออกใบเบิกค่าตอบแทนภายในหน่วยงาน
          ตัวเลขค่าตอบแทนเป็นการคำนวณเบื้องต้น ควรตรวจทานกับระเบียบการเงินก่อนใช้จริง
        </div>
      </footer>

      <AnimatePresence>
        {dayModalDate && (
          <DayScheduleModal
            dateStr={dayModalDate}
            staff={staff}
            duties={duties}
            settings={settings}
            holidays={holidays}
            selectedDeptId={selectedDeptId}
            onClose={() => setDayModalDate(null)}
            onSave={handleSaveDuty}
            onDeleteDuty={handleDeleteDuty}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
