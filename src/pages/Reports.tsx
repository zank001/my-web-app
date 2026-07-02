import { Download } from 'lucide-react'
import Card from '../components/Card'
import { useStore } from '../data/store'
import { ackLabel, docTypeLabel } from '../lib/format'

export default function Reports() {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const dists = useStore((s) => s.distributions)

  const byType = Object.fromEntries(
    Object.keys(docTypeLabel).map((k) => [k, docs.filter((d) => d.type === k).length]),
  )
  const total = docs.length || 1

  const byDept = depts.map((d) => {
    const recs = dists.flatMap((x) => x.recipients).filter((r) => r.departmentId === d.id)
    const ack = recs.filter((r) => r.status === 'acknowledged').length
    const opened = recs.filter((r) => r.status === 'opened').length
    const pending = recs.filter((r) => r.status === 'pending').length
    const overdue = recs.filter((r) => r.status === 'overdue').length
    return { dept: d, ack, opened, pending, overdue, total: recs.length }
  })

  const exportCsv = () => {
    const lines = ['หน่วยงาน,รหัส,รับทราบ,เปิดแล้ว,รอ,เกินกำหนด,รวม']
    byDept.forEach((r) =>
      lines.push(`${r.dept.nameTh},${r.dept.code},${r.ack},${r.opened},${r.pending},${r.overdue},${r.total}`),
    )
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qmr-acknowledgement-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายงาน & ตรวจสอบ</h1>
          <p className="text-sm text-slate-500">รายงานสำหรับ Internal Audit / Document Control Review</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          <Download size={16}/> Export CSV
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="สัดส่วนเอกสารตามประเภท">
          <ul className="space-y-3">
            {Object.entries(byType).map(([t, n]) => {
              const pct = Math.round(((n as number) / total) * 100)
              return (
                <li key={t}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">{docTypeLabel[t]}</span>
                    <span className="text-slate-500">{n as number} ฉบับ · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="สถานะรับทราบรวม (ทุกเอกสาร)">
          {(() => {
            const all = dists.flatMap((d) => d.recipients)
            const total2 = all.length || 1
            const counts = {
              acknowledged: all.filter((r) => r.status === 'acknowledged').length,
              opened: all.filter((r) => r.status === 'opened').length,
              pending: all.filter((r) => r.status === 'pending').length,
              overdue: all.filter((r) => r.status === 'overdue').length,
            }
            const colors: Record<string, string> = {
              acknowledged: 'bg-emerald-500',
              opened:       'bg-amber-400',
              pending:      'bg-slate-300',
              overdue:      'bg-rose-500',
            }
            return (
              <>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {Object.entries(counts).map(([k, v]) => (
                    <div key={k} className={colors[k]} style={{ width: `${(v / total2) * 100}%` }} />
                  ))}
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(counts).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <span className={`h-2 w-2 rounded-full ${colors[k]}`} />
                      <span className="flex-1">{ackLabel[k]}</span>
                      <span className="font-bold">{v}</span>
                    </li>
                  ))}
                </ul>
              </>
            )
          })()}
        </Card>
      </div>

      <Card title="ตารางรายงานรายหน่วยงาน">
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">หน่วยงาน</th>
                <th className="px-4 py-3 text-center">รับทราบ</th>
                <th className="px-4 py-3 text-center">เปิดแล้ว</th>
                <th className="px-4 py-3 text-center">รอ</th>
                <th className="px-4 py-3 text-center">เกินกำหนด</th>
                <th className="px-4 py-3 text-center">รวม</th>
                <th className="px-4 py-3">อัตรารับทราบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byDept.map((r) => {
                const pct = r.total ? Math.round((r.ack / r.total) * 100) : 0
                return (
                  <tr key={r.dept.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.dept.nameTh}</div>
                      <div className="text-xs text-slate-500">{r.dept.code} · {r.dept.head}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-700">{r.ack}</td>
                    <td className="px-4 py-3 text-center text-amber-700">{r.opened}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{r.pending}</td>
                    <td className="px-4 py-3 text-center text-rose-600">{r.overdue}</td>
                    <td className="px-4 py-3 text-center font-semibold">{r.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
