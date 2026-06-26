import { Download, Eye, FileText, Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { PriorityBadge, StatusBadge, TypeBadge } from '../components/Badges'
import { useStore } from '../data/store'
import { docTypeLabel, formatBytes, formatDate } from '../lib/format'
import type { DocumentType } from '../types'

const typeOrder: DocumentType[] = ['policy', 'procedure', 'work_instruction', 'manual', 'form', 'announcement', 'external']

export default function Documents() {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const [q, setQ] = useState('')
  const [type, setType] = useState<DocumentType | 'all'>('all')

  const list = useMemo(() => {
    return docs.filter((d) => {
      if (type !== 'all' && d.type !== type) return false
      if (!q.trim()) return true
      const s = q.toLowerCase()
      return d.title.toLowerCase().includes(s)
        || d.code.toLowerCase().includes(s)
        || d.tags.some((t) => t.toLowerCase().includes(s))
    })
  }, [docs, q, type])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">คลังเอกสารคุณภาพ</h1>
        <p className="text-sm text-slate-500">เอกสารทั้งหมดที่อยู่ภายใต้การควบคุมของ QMR</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อเอกสาร / แท็ก"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter size={16} /> ประเภท
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as DocumentType | 'all')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="all">ทั้งหมด</option>
            {typeOrder.map((t) => (
              <option key={t} value={t}>{docTypeLabel[t]}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">เอกสาร</th>
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">หน่วยงานเจ้าของ</th>
                <th className="px-4 py-3">เวอร์ชัน</th>
                <th className="px-4 py-3">มีผล</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((d) => {
                const owner = depts.find((x) => x.id === d.ownerDepartmentId)
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="font-semibold leading-tight">{d.code}</div>
                          <div className="text-[13px] text-slate-700">{d.title}</div>
                          <div className="text-[11px] text-slate-400">{d.fileName} · {formatBytes(d.fileSize)}{d.pageCount ? ` · ${d.pageCount} หน้า` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={d.type} /></td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{owner?.nameTh}</div>
                      <div className="text-[11px] text-slate-500">{owner?.code}</div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold">v{d.version}</span></td>
                    <td className="px-4 py-3 text-xs">{formatDate(d.effectiveDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={d.status} />
                        <PriorityBadge p={d.priority} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100" title="ดู"><Eye size={16}/></button>
                        <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100" title="ดาวน์โหลด"><Download size={16}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">ไม่พบเอกสารที่ตรงกับเงื่อนไข</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
