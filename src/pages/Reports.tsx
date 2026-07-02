import { Download, Flame } from 'lucide-react'
import Card from '../components/Card'
import { useStore } from '../data/store'
import { ackLabel, docCode, formatDate, levelLabel } from '../lib/format'
import type { DocLevel } from '../types'

const levels: DocLevel[] = ['QM', 'SOP', 'WI', 'FM', 'EXT']

export default function Reports() {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const dists = useStore((s) => s.distributions)

  const total = docs.length || 1
  const byLevel = levels.map((l) => ({ level: l, n: docs.filter((d) => d.level === l).length }))

  const allRecipients = dists.flatMap((d) => d.recipients)
  const ackCounts = {
    acknowledged: allRecipients.filter((r) => r.status === 'acknowledged').length,
    opened: allRecipients.filter((r) => r.status === 'opened').length,
    pending: allRecipients.filter((r) => r.status === 'pending').length,
    overdue: allRecipients.filter((r) => r.status === 'overdue').length,
  }
  const ackTotal = allRecipients.length || 1
  const ackColors: Record<string, string> = {
    acknowledged: 'bg-emerald-500', opened: 'bg-amber-400', pending: 'bg-slate-300', overdue: 'bg-rose-500',
  }

  const deptRows = depts
    .map((d) => {
      const recs = allRecipients.filter((r) => allRecipientDept(r) === d.code)
      return {
        dept: d,
        docs: docs.filter((x) => x.deptCode === d.code && x.status !== 'cancelled').length,
        ack: recs.filter((r) => r.status === 'acknowledged').length,
        total: recs.length,
        overdue: recs.filter((r) => r.status === 'overdue').length,
      }
    })
    .filter((r) => r.docs > 0 || r.total > 0)

  const cancelled = docs.filter((d) => d.status === 'cancelled')

  const exportCsv = () => {
    const lines = ['หน่วยงาน,รหัส,เอกสารที่ถือครอง,รับทราบ,รวมที่ได้รับแจกจ่าย,เกินกำหนด']
    deptRows.forEach((r) =>
      lines.push([`"${r.dept.nameTh}"`, r.dept.code, r.docs, r.ack, r.total, r.overdue].join(',')),
    )
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qmr-audit-report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายงาน & ตรวจสอบ</h1>
          <p className="text-sm text-slate-500">สรุปสำหรับ Internal Audit และการทบทวนระบบเอกสาร (Document Control Review)</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="สัดส่วนเอกสารตามระดับ (4 ระดับ + ภายนอก)">
          <ul className="space-y-3">
            {byLevel.map(({ level, n }) => {
              const pct = Math.round((n / total) * 100)
              return (
                <li key={level}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">{levelLabel[level]}</span>
                    <span className="text-slate-500">{n} ฉบับ · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="สถานะการลงนามรับทราบรวม">
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {Object.entries(ackCounts).map(([k, v]) => (
              <div key={k} className={ackColors[k]} style={{ width: `${(v / ackTotal) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(ackCounts).map(([k, v]) => (
              <li key={k} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className={`h-2 w-2 rounded-full ${ackColors[k]}`} />
                <span className="flex-1">{ackLabel[k]}</span>
                <span className="font-bold">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="รายงานรายหน่วยงาน">
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">หน่วยงาน</th>
                <th className="px-4 py-3 text-center">เอกสารที่จัดทำ</th>
                <th className="px-4 py-3 text-center">ได้รับแจกจ่าย</th>
                <th className="px-4 py-3 text-center">เกินกำหนด</th>
                <th className="px-4 py-3">อัตรารับทราบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptRows.map((r) => {
                const pct = r.total ? Math.round((r.ack / r.total) * 100) : 0
                return (
                  <tr key={r.dept.code}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-700">{r.dept.code}</span>
                      <span className="ml-2 text-slate-700">{r.dept.nameTh}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{r.docs}</td>
                    <td className="px-4 py-3 text-center">{r.total}</td>
                    <td className={'px-4 py-3 text-center ' + (r.overdue ? 'font-semibold text-rose-600' : 'text-slate-400')}>{r.overdue}</td>
                    <td className="px-4 py-3">
                      {r.total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{pct}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={<span className="inline-flex items-center gap-2"><Flame size={16} className="text-rose-500" /> เอกสารยกเลิก — รอครบกำหนดทำลาย (เก็บ 1 ปีนับจากวันยกเลิก)</span>}>
        {cancelled.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">ไม่มีเอกสารรอทำลาย</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cancelled.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-mono text-sm font-bold text-slate-500 line-through">{docCode(d)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700">{d.title}</div>
                  <div className="text-xs text-slate-500">
                    ยกเลิกเมื่อ {d.cancelledAt ? formatDate(d.cancelledAt) : '—'}
                  </div>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  ทำลายได้หลัง {d.destroyAfter ? formatDate(d.destroyAfter) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

const allRecipientDept = (r: { deptCode: string }) => r.deptCode
