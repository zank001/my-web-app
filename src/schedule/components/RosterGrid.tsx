import { useState } from 'react'
import { AlertTriangle, Plus, UserRound } from 'lucide-react'
import { actions, useSchedule } from '../store'
import { cellKey } from '../types'
import type { Shift, Staff } from '../types'
import { formatDayLabel, fromISODate, isWeekend, todayISO, weekdayNamesTh } from '../lib/date'
import Modal from './Modal'

export default function RosterGrid({ dates }: { dates: string[] }) {
  const staff = useSchedule((s) => s.staff)
  const shifts = useSchedule((s) => s.shifts)
  const assignments = useSchedule((s) => s.assignments)
  const [cell, setCell] = useState<{ date: string; shift: Shift } | null>(null)

  const ordered = [...shifts].sort((a, b) => a.order - b.order)
  const staffById = new Map(staff.map((s) => [s.id, s]))
  const today = todayISO()

  if (!ordered.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        ยังไม่มีช่วงเวร — เพิ่มประเภทเวรก่อนในแท็บ “ประเภทเวร”
      </div>
    )
  }

  return (
    <div className="overflow-x-auto scrollbar-thin rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-40 border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-xs font-semibold text-slate-500">
              เวร \ วัน
            </th>
            {dates.map((d) => {
              const isToday = d === today
              return (
                <th
                  key={d}
                  className={`border-b border-slate-200 p-2 text-center text-xs font-semibold ${
                    isToday ? 'bg-brand-50 text-brand-700' : isWeekend(d) ? 'bg-rose-50/60 text-rose-600' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  <div>{weekdayNamesTh[fromISODate(d).getDay()]}</div>
                  <div className="text-[11px] font-normal text-slate-400">{formatDayLabel(d)}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {ordered.map((sh) => (
            <tr key={sh.id}>
              <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-3 text-left align-top">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sh.color }} />
                  <span className="text-sm font-semibold text-slate-800">{sh.name}</span>
                </div>
                <div className="mt-0.5 pl-5 text-[11px] text-slate-400">
                  {sh.start}–{sh.end} · ต้องการ {sh.required} คน
                </div>
              </th>
              {dates.map((d) => {
                const ids = assignments[cellKey(d, sh.id)] ?? []
                const short = ids.length < sh.required
                return (
                  <td key={d} className="border-b border-l border-slate-100 p-1.5 align-top">
                    <button
                      onClick={() => setCell({ date: d, shift: sh })}
                      className={`group flex min-h-[64px] w-full flex-col gap-1 rounded-lg border p-1.5 text-left transition ${
                        short
                          ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                          : 'border-transparent bg-slate-50/60 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {ids.map((id) => {
                        const p = staffById.get(id)
                        if (!p) return null
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white"
                            style={{ background: p.color }}
                          >
                            <UserRound size={11} /> {p.name.split(' ')[0]}
                          </span>
                        )
                      })}
                      {short && (
                        <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-medium text-rose-500">
                          <AlertTriangle size={11} /> ขาด {sh.required - ids.length}
                        </span>
                      )}
                      {ids.length === 0 && !short && (
                        <span className="mt-auto inline-flex items-center gap-1 text-[11px] text-slate-300 group-hover:text-slate-400">
                          <Plus size={12} /> จัดเวร
                        </span>
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <AssignModal cell={cell} onClose={() => setCell(null)} />
    </div>
  )
}

function AssignModal({
  cell, onClose,
}: {
  cell: { date: string; shift: Shift } | null
  onClose: () => void
}) {
  const staff = useSchedule((s) => s.staff)
  const assignments = useSchedule((s) => s.assignments)
  if (!cell) return null

  const { date, shift } = cell
  const weekday = fromISODate(date).getDay()
  const assigned = assignments[cellKey(date, shift.id)] ?? []

  // ผู้ที่ถูกจัดเวรอื่นในวันเดียวกันแล้ว (เตือนไม่ให้จัดซ้อน)
  const busyElsewhere = new Set<string>()
  for (const [key, ids] of Object.entries(assignments)) {
    if (key.startsWith(date + '__') && key !== cellKey(date, shift.id)) ids.forEach((id) => busyElsewhere.add(id))
  }

  const sorted = [...staff].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'th'))

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: shift.color }} />
          {shift.name} · {weekdayNamesTh[weekday]} {formatDayLabel(date)}
        </span>
      }
    >
      <p className="mb-3 text-xs text-slate-500">
        ต้องการ {shift.required} คน · จัดแล้ว {assigned.length} คน
        {assigned.length < shift.required && <span className="text-rose-500"> (ยังขาด {shift.required - assigned.length})</span>}
      </p>
      <div className="space-y-1.5">
        {sorted.map((p) => (
          <StaffToggleRow
            key={p.id}
            staff={p}
            checked={assigned.includes(p.id)}
            unavailable={p.unavailableWeekdays.includes(weekday)}
            busy={busyElsewhere.has(p.id) && !assigned.includes(p.id)}
            onToggle={() => actions.toggleAssign(date, shift.id, p.id)}
          />
        ))}
      </div>
    </Modal>
  )
}

function StaffToggleRow({
  staff, checked, unavailable, busy, onToggle,
}: {
  staff: Staff
  checked: boolean
  unavailable: boolean
  busy: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${
        checked ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
      } ${!staff.active ? 'opacity-50' : ''}`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-brand-600" />
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: staff.color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-800">{staff.name}</span>
        <span className="block truncate text-[11px] text-slate-400">{staff.role}</span>
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        {!staff.active && <Tag className="bg-slate-200 text-slate-600">ปิดใช้งาน</Tag>}
        {unavailable && <Tag className="bg-amber-100 text-amber-700">วันลา</Tag>}
        {busy && <Tag className="bg-orange-100 text-orange-700">มีเวรอื่น</Tag>}
      </span>
    </label>
  )
}

const Tag = ({ children, className }: { children: React.ReactNode; className: string }) => (
  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>{children}</span>
)
