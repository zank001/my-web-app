import { Mail, MessageSquare, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { AckBadge, TypeBadge } from '../components/Badges'
import { actions, useStore } from '../data/store'
import { formatDate, relativeTime } from '../lib/format'
import type { Distribution as Dist } from '../types'

export default function Distribution() {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const dists = useStore((s) => s.distributions)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  const sendable = useMemo(
    () => docs.filter((d) => d.status === 'approved' || d.status === 'distributed'),
    [docs],
  )

  const [docId, setDocId] = useState<string>(sendable[0]?.id ?? '')
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [message, setMessage] = useState('ขอให้ทุกหน่วยพิจารณาและถ่ายทอดให้บุคลากรในสังกัด')
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10)
  })
  const [channels, setChannels] = useState<Array<'email' | 'in_app' | 'line'>>(['email', 'in_app'])

  const toggleDept = (id: string) =>
    setSelectedDepts((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const toggleChannel = (c: 'email' | 'in_app' | 'line') =>
    setChannels((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  const send = async () => {
    if (!docId || selectedDepts.length === 0) return
    const dist: Dist = {
      id: `dist-${Date.now().toString(36)}`,
      documentId: docId,
      sentById: me?.id ?? 'u-qmr',
      sentAt: new Date().toISOString(),
      dueAt: new Date(dueAt).toISOString(),
      message,
      channels,
      recipients: selectedDepts.map((id) => ({ departmentId: id, status: 'pending' as const })),
    }
    actions.createDistribution(dist)

    if (channels.includes('email')) {
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distributionId: dist.id,
            documentCode: docs.find((d) => d.id === docId)?.code,
            message,
            recipients: selectedDepts
              .map((id) => depts.find((d) => d.id === id))
              .filter(Boolean)
              .map((d) => ({ name: d!.nameTh, email: d!.email })),
          }),
        })
      } catch { /* server not running in pure-frontend demo */ }
    }
    setSelectedDepts([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">การจ่ายเอกสาร</h1>
        <p className="text-sm text-slate-500">ส่งเอกสารคุณภาพไปยังหน่วยงานปลายทาง พร้อมติดตามการรับทราบ</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="สร้างชุดการจ่าย" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="เลือกเอกสาร">
              <select value={docId} onChange={(e) => setDocId(e.target.value)} className={inputCls}>
                {sendable.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.title} (v{d.version})</option>
                ))}
              </select>
            </Field>

            <Field label="หน่วยงานปลายทาง">
              <div className="mb-2 flex items-center gap-2 text-xs">
                <button type="button" onClick={() => setSelectedDepts(depts.map((d) => d.id))} className="rounded-md bg-slate-100 px-2 py-1 hover:bg-slate-200">เลือกทั้งหมด</button>
                <button type="button" onClick={() => setSelectedDepts([])} className="rounded-md bg-slate-100 px-2 py-1 hover:bg-slate-200">ล้าง</button>
                <span className="text-slate-500">เลือกแล้ว {selectedDepts.length} หน่วยงาน</span>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {depts.map((d) => {
                  const on = selectedDepts.includes(d.id)
                  return (
                    <button
                      key={d.id} type="button" onClick={() => toggleDept(d.id)}
                      className={
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ' +
                        (on
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-slate-200 hover:bg-slate-50')
                      }
                    >
                      <span><span className="font-semibold">{d.code}</span> <span className="text-xs text-slate-500">{d.nameTh}</span></span>
                      <span className={`h-2 w-2 rounded-full ${on ? 'bg-brand-500' : 'bg-slate-300'}`} />
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="กำหนดรับทราบภายใน">
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="ช่องทางการแจ้ง">
                <div className="flex gap-2">
                  {([
                    ['email', 'อีเมล', Mail],
                    ['in_app', 'ในแอป', Send],
                    ['line', 'LINE OA', MessageSquare],
                  ] as const).map(([k, lbl, Icon]) => (
                    <button
                      key={k} type="button" onClick={() => toggleChannel(k)}
                      className={
                        'inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs transition ' +
                        (channels.includes(k)
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                      }
                    >
                      <Icon size={14} /> {lbl}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="ข้อความถึงผู้รับ">
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={send} disabled={!docId || selectedDepts.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                <Send size={16} /> ส่งเอกสาร
              </button>
            </div>
          </div>
        </Card>

        <Card title="สถิติการจ่าย">
          <div className="space-y-3 text-sm">
            <Stat label="ทั้งหมด" value={dists.length} />
            <Stat label="กำลังติดตาม" value={dists.filter((d) => d.recipients.some((r) => r.status !== 'acknowledged')).length} />
            <Stat label="ครบทุกหน่วย" value={dists.filter((d) => d.recipients.every((r) => r.status === 'acknowledged')).length} />
          </div>
        </Card>
      </div>

      <Card title="ประวัติการจ่ายเอกสาร">
        <ul className="space-y-3">
          {[...dists].sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)).map((d) => {
            const doc = docs.find((x) => x.id === d.documentId)
            if (!doc) return null
            const ack = d.recipients.filter((r) => r.status === 'acknowledged').length
            const overdue = d.recipients.filter((r) => r.status === 'overdue').length
            return (
              <li key={d.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{doc.code}</span>
                      <span className="text-slate-600">{doc.title}</span>
                      <TypeBadge type={doc.type} />
                    </div>
                    <div className="text-xs text-slate-500">
                      ส่งโดย QMR · {relativeTime(d.sentAt)} · ครบกำหนด {formatDate(d.dueAt)}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{d.message}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold">{ack}/{d.recipients.length} รับทราบ</div>
                    {overdue > 0 && <div className="text-rose-600">{overdue} เกินกำหนด</div>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.recipients.map((r) => {
                    const dept = depts.find((x) => x.id === r.departmentId)
                    return (
                      <span key={r.departmentId} className="inline-flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-xs">
                        <span className="font-semibold">{dept?.code}</span>
                        <AckBadge status={r.status} />
                      </span>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
    {children}
  </div>
)
const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
)
