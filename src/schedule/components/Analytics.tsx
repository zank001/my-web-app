import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react'
import { useSchedule } from '../store'
import { cellKey } from '../types'
import { computeCoverage, computeStaffLoads } from '../lib/stats'
import { fromISODate, weekdayShortTh } from '../lib/date'

export default function Analytics({ dates }: { dates: string[] }) {
  const staff = useSchedule((s) => s.staff)
  const shifts = useSchedule((s) => s.shifts)
  const assignments = useSchedule((s) => s.assignments)

  const loads = useMemo(
    () => computeStaffLoads(dates, shifts, staff, assignments).filter((l) => l.staff.active || l.count > 0),
    [dates, shifts, staff, assignments],
  )
  const coverage = useMemo(() => computeCoverage(dates, shifts, assignments), [dates, shifts, assignments])

  const perStaff = loads
    .map((l) => ({ name: l.staff.name.split(' ')[0], count: l.count, hours: l.hours, color: l.staff.color }))
    .sort((a, b) => b.count - a.count)

  const perDay = dates.map((d) => {
    let assigned = 0
    let required = 0
    for (const sh of shifts) {
      assigned += Math.min((assignments[cellKey(d, sh.id)] ?? []).length, sh.required)
      required += sh.required
    }
    return { day: weekdayShortTh[fromISODate(d).getDay()], assigned, required }
  })

  const counts = loads.map((l) => l.count)
  const withShift = counts.filter((c) => c > 0).length
  const max = counts.length ? Math.max(...counts) : 0
  const min = counts.length ? Math.min(...counts.filter((c) => c > 0).concat(counts.length ? [0] : [])) : 0
  const totalHours = loads.reduce((sum, l) => sum + l.hours, 0)
  const coveragePct = coverage.totalRequired ? Math.round((coverage.totalAssigned / coverage.totalRequired) * 100) : 100

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CheckCircle2 size={18} />} tone="emerald" label="ความครบของเวร" value={`${coveragePct}%`} sub={`จัดแล้ว ${coverage.totalAssigned}/${coverage.totalRequired} ตำแหน่ง`} />
        <Stat icon={<AlertTriangle size={18} />} tone={coverage.understaffed ? 'rose' : 'slate'} label="ช่องที่ยังขาดคน" value={String(coverage.understaffed)} sub={`จากทั้งหมด ${coverage.filled + coverage.understaffed} ช่อง`} />
        <Stat icon={<Users size={18} />} tone="brand" label="บุคลากรที่มีเวร" value={String(withShift)} sub={`ช่วง ${min}–${max} เวร/คน`} />
        <Stat icon={<Clock size={18} />} tone="violet" label="ชั่วโมงรวมทั้งทีม" value={`${Math.round(totalHours)}`} sub="ชั่วโมงในสัปดาห์นี้" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="จำนวนเวรต่อคน (ความเป็นธรรม)">
          {perStaff.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, perStaff.length * 34)}>
              <BarChart data={perStaff} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value, _name, item) => {
                    const hours = (item?.payload as { hours?: number } | undefined)?.hours ?? 0
                    return [`${value} เวร · ${hours} ชม.`, 'ภาระงาน']
                  }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {perStaff.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="ความครอบคลุมรายวัน (จัดแล้ว / ต้องการ)">
          <ResponsiveContainer width="100%" height={Math.max(200, perStaff.length * 34)}>
            <BarChart data={perDay} margin={{ left: -16, right: 8 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#475569' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="required" name="ต้องการ" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
              <Bar dataKey="assigned" name="จัดแล้ว" fill="#2f8fff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  rose: 'bg-rose-50 text-rose-600',
  brand: 'bg-brand-50 text-brand-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-500',
}

function Stat({ icon, tone, label, value, sub }: { icon: React.ReactNode; tone: string; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONES[tone]}`}>{icon}</span>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  )
}

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="mb-3 text-sm font-semibold text-slate-800">{title}</h3>
    {children}
  </section>
)

const Empty = () => (
  <div className="grid h-[200px] place-items-center text-sm text-slate-400">ยังไม่มีข้อมูลเวรในสัปดาห์นี้</div>
)
