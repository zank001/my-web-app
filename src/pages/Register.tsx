import { ChevronDown, ChevronRight, Download, FileText, Flame } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { LevelBadge, StatusBadge } from '../components/Badges'
import { useStore } from '../data/store'
import { docCode, formatDate, levelLabel, statusLabel } from '../lib/format'
import type { DocLevel, DocumentStatus } from '../types'

const levels: Array<DocLevel | 'all'> = ['all', 'QM', 'SOP', 'WI', 'FM', 'EXT']

export default function Register({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const [level, setLevel] = useState<DocLevel | 'all'>('all')
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return docs
      .filter((d) => (level === 'all' || d.level === level))
      .filter((d) => (status === 'all' || d.status === status))
      .filter((d) =>
        !q ||
        d.title.toLowerCase().includes(q) ||
        docCode(d).toLowerCase().includes(q) ||
        d.deptCode.toLowerCase().includes(q))
      .sort((a, b) => docCode(a).localeCompare(docCode(b)))
  }, [docs, level, status, query])

  const exportCsv = () => {
    const lines = ['รหัสเอกสาร,ชื่อเรื่อง,ระดับ,หน่วยงาน,แก้ไขครั้งที่,วันที่มีผล,สถานะ']
    list.forEach((d) => {
      const dept = depts.find((x) => x.code === d.deptCode)
      lines.push([docCode(d), `"${d.title}"`, d.level, `"${dept?.nameTh ?? d.deptCode}"`, d.revision, formatDate(d.effectiveDate), statusLabel[d.status]].join(','))
    })
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FM-QMR-002_บัญชีรายการเอกสารคุณภาพ_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">บัญชีรายการเอกสารคุณภาพ</h1>
          <p className="text-sm text-slate-500">ทะเบียนกลางตามแบบฟอร์ม FM-QMR-002 · ต้นฉบับทุกฉบับเก็บที่ศูนย์คุณภาพ</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          <Download size={16} /> Export บัญชี (CSV)
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อเรื่อง / หน่วยงาน"
            className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex flex-wrap gap-1">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition ' +
                  (level === l ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }
              >
                {l === 'all' ? 'ทุกระดับ' : l}
              </button>
            ))}
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus | 'all')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="all">ทุกสถานะ</option>
            {(Object.keys(statusLabel) as DocumentStatus[]).map((s) => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-3 py-3">รหัสเอกสาร</th>
                <th className="px-3 py-3">ชื่อเรื่อง</th>
                <th className="px-3 py-3">ระดับ</th>
                <th className="px-3 py-3">หน่วยงาน</th>
                <th className="px-3 py-3 text-center">แก้ไขครั้งที่</th>
                <th className="px-3 py-3">วันที่มีผล</th>
                <th className="px-3 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((d) => {
                const dept = depts.find((x) => x.code === d.deptCode)
                const expanded = open === d.id
                return (
                  <FragmentRow key={d.id}>
                    <tr
                      onClick={() => setOpen(expanded ? null : d.id)}
                      className={'cursor-pointer hover:bg-slate-50 ' + (d.isMaster ? 'bg-violet-50/40' : '')}
                    >
                      <td className="px-2 py-3 text-slate-400">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="px-3 py-3 font-mono text-[13px] font-semibold text-brand-700">{docCode(d)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.title}</span>
                          {d.isMaster && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                              เอกสารแม่บท
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3"><LevelBadge level={d.level} /></td>
                      <td className="px-3 py-3">
                        <span className="font-semibold">{d.deptCode}</span>
                        <span className="ml-1 hidden text-xs text-slate-500 xl:inline">{dept?.nameTh}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold">{d.revision}</span>
                      </td>
                      <td className="px-3 py-3 text-xs">{formatDate(d.effectiveDate)}</td>
                      <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50/60">
                        <td></td>
                        <td colSpan={7} className="px-3 pb-4 pt-1">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                              <div className="mb-1 text-xs font-semibold text-slate-500">สาระสำคัญ</div>
                              <p className="text-sm text-slate-700">{d.summary}</p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                <Sig label="ผู้จัดทำ" name={d.preparedBy} />
                                <Sig label="ผู้ทบทวน" name={d.reviewedBy} />
                                <Sig label="ผู้อนุมัติ" name={d.approvedBy} />
                              </div>
                              {d.status === 'cancelled' && d.destroyAfter && (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                  <Flame size={14} />
                                  ประทับตรา "ยกเลิก" เมื่อ {d.cancelledAt ? formatDate(d.cancelledAt) : '—'} · เก็บถึง {formatDate(d.destroyAfter)} แล้วทำลาย
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-semibold text-slate-500">บันทึกการแก้ไขเอกสาร</div>
                              {d.revisionLog.length === 0 ? (
                                <div className="text-xs text-slate-400">ยังไม่มีบันทึก</div>
                              ) : (
                                <ul className="space-y-1.5">
                                  {d.revisionLog.map((r, i) => (
                                    <li key={i} className="flex gap-2 text-xs">
                                      <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 font-mono font-semibold">ครั้งที่ {r.revision}</span>
                                      <span className="text-slate-600">{formatDate(r.date)} — {r.note}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
                                <FileText size={12} /> {d.fileName}{d.pageCount ? ` · ${d.pageCount} หน้า` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                )
              })}
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">ไม่พบเอกสารที่ตรงกับเงื่อนไข</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          ระดับเอกสาร: {(['QM', 'SOP', 'WI', 'FM', 'EXT'] as DocLevel[]).map((l) => `${l} = ${levelLabel[l]}`).join(' · ')}
        </p>
      </Card>
    </div>
  )
}

const FragmentRow = ({ children }: { children: React.ReactNode }) => <>{children}</>

const Sig = ({ label, name }: { label: string; name: string }) => (
  <div className="rounded-lg bg-white p-2 ring-1 ring-slate-100">
    <div className="text-[10px] text-slate-400">{label}</div>
    <div className="font-medium text-slate-700">{name}</div>
  </div>
)
