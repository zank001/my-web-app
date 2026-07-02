import { Mail, MessageSquare, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { AckBadge, LevelBadge } from '../components/Badges'
import { actions, useStore } from '../data/store'
import { docCode, formatDate, relativeTime } from '../lib/format'

/** QMR เป็นผู้แจกจ่าย/เรียกคืนเอกสารทุกระดับ (ตารางหน้า 8) */
export default function Distribution() {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const dists = useStore((s) => s.distributions)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  const controlled = useMemo(() => docs.filter((d) => d.status === 'controlled'), [docs])

  const [docId, setDocId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [message, setMessage] = useState('ขอให้หน่วยงานศึกษา ถือปฏิบัติ และถ่ายทอดให้บุคลากรในสังกัด')
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10)
  })
  const [channels, setChannels] = useState<Array<'email' | 'in_app' | 'line'>>(['email', 'in_app'])

  const effectiveDocId = docId || controlled[0]?.id || ''

  const toggleDept = (code: string) =>
    setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]))
  const toggleChannel = (c: 'email' | 'in_app' | 'line') =>
    setChannels((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))

  const send = async () => {
    if (!effectiveDocId || selected.length === 0) return
    actions.createDistribution({
      documentId: effectiveDocId,
      sentBy: me?.name ?? 'QMR',
      dueAt: new Date(dueAt).toISOString(),
      message,
      channels,
      recipients: selected.map((code) => ({ deptCode: code, status: 'pending' as const })),
    })
    if (channels.includes('email')) {
      const doc = docs.find((d) => d.id === effectiveDocId)
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentCode: doc ? docCode(doc) : '',
            message,
            recipients: selected.map((code) => {
              const d = depts.find((x) => x.code === code)
              return { name: d?.nameTh ?? code, email: `${code.toLowerCase()}@paihospital.go.th` }
            }),
          }),
        })
      } catch { /* demo mode: notify server ไม่ได้รัน */ }
    }
    setSelected([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">การแจกจ่ายเอกสารควบคุม</h1>
        <p className="text-sm text-slate-500">
          แจกจ่ายเฉพาะเอกสารสถานะ "เอกสารควบคุม" · ผู้แจกจ่าย/เรียกคืน: QMR · ติดตามการลงนามรับทราบรายหน่วย
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="สร้างรอบแจกจ่าย" className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="เลือกเอกสารควบคุม">
              <select value={effectiveDocId} onChange={(e) => setDocId(e.target.value)} className={inputCls}>
                {controlled.map((d) => (
                  <option key={d.id} value={d.id}>{docCode(d)} — {d.title}</option>
                ))}
              </select>
            </Field>

            <Field label="หน่วยงาน/คณะกรรมการปลายทาง">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <button type="button" onClick={() => setSelected(depts.map((d) => d.code))} className="rounded-md bg-slate-100 px-2 py-1 hover:bg-slate-200">เลือกทั้งหมด</button>
                <button type="button" onClick={() => setSelected(depts.filter((d) => d.group === 'งานการพยาบาล').map((d) => d.code))} className="rounded-md bg-slate-100 px-2 py-1 hover:bg-slate-200">เฉพาะงานการพยาบาล</button>
                <button type="button" onClick={() => setSelected(depts.filter((d) => d.group === 'คณะกรรมการ').map((d) => d.code))} className="rounded-md bg-slate-100 px-2 py-1 hover:bg-slate-200">เฉพาะคณะกรรมการ</button>
                <button type="button" onClick={() => setSelected([])} className="rounded-md bg-slate-100 px-2 py-1 hover:bg-slate-200">ล้าง</button>
                <span className="text-slate-500">เลือกแล้ว {selected.length}</span>
              </div>
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-thin md:grid-cols-3">
                {depts.map((d) => {
                  const on = selected.includes(d.code)
                  return (
                    <button
                      key={d.code} type="button" onClick={() => toggleDept(d.code)}
                      title={d.nameTh}
                      className={
                        'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ' +
                        (on ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 hover:bg-slate-50')
                      }
                    >
                      <span className="min-w-0">
                        <span className="font-mono font-semibold">{d.code}</span>
                        <span className="ml-1.5 truncate text-xs text-slate-500">{d.nameTh.length > 18 ? d.nameTh.slice(0, 18) + '…' : d.nameTh}</span>
                      </span>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${on ? 'bg-brand-500' : 'bg-slate-300'}`} />
                    </button>
                  )
                })}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="กำหนดลงนามรับทราบภายใน">
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="ช่องทางการแจ้ง">
                <div className="flex gap-2">
                  {([['email', 'อีเมล', Mail], ['in_app', 'ในแอป', Send], ['line', 'LINE OA', MessageSquare]] as const).map(([k, lbl, Icon]) => (
                    <button
                      key={k} type="button" onClick={() => toggleChannel(k)}
                      className={
                        'inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs transition ' +
                        (channels.includes(k) ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50')
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

            <div className="flex justify-end">
              <button
                onClick={send}
                disabled={!effectiveDocId || selected.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={16} /> แจกจ่ายเอกสาร
              </button>
            </div>
          </div>
        </Card>

        <Card title="สถิติการแจกจ่าย">
          <div className="space-y-3 text-sm">
            <MiniStat label="รอบแจกจ่ายทั้งหมด" value={dists.length} />
            <MiniStat label="กำลังติดตามรับทราบ" value={dists.filter((d) => d.recipients.some((r) => r.status !== 'acknowledged')).length} />
            <MiniStat label="รับทราบครบทุกหน่วย" value={dists.filter((d) => d.recipients.every((r) => r.status === 'acknowledged')).length} />
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            ตามข้อ 6.2 เอกสารต้องผ่านการอนุมัติและประทับตรา "เอกสารควบคุม" ก่อนทำสำเนาแจกจ่าย
            ระบบจึงแสดงเฉพาะเอกสารที่พร้อมแจกจ่ายเท่านั้น
          </div>
        </Card>
      </div>

      <Card title="ประวัติการแจกจ่าย">
        <ul className="space-y-3">
          {[...dists].sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)).map((d) => {
            const doc = docs.find((x) => x.id === d.documentId)
            if (!doc) return null
            const ack = d.recipients.filter((r) => r.status === 'acknowledged').length
            const over = d.recipients.filter((r) => r.status === 'overdue').length
            return (
              <li key={d.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-brand-700">{docCode(doc)}</span>
                      <span className="font-medium">{doc.title}</span>
                      <LevelBadge level={doc.level} />
                    </div>
                    <div className="text-xs text-slate-500">
                      แจกจ่ายโดย {d.sentBy} · {relativeTime(d.sentAt)} · ครบกำหนด {formatDate(d.dueAt)}
                    </div>
                    <div className="mt-1 text-sm text-slate-700">{d.message}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-semibold">{ack}/{d.recipients.length} รับทราบ</div>
                    {over > 0 && <div className="text-rose-600">{over} เกินกำหนด</div>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.recipients.map((r) => (
                    <span key={r.deptCode} className="inline-flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-xs">
                      <span className="font-mono font-semibold">{r.deptCode}</span>
                      <AckBadge status={r.status} />
                    </span>
                  ))}
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
const MiniStat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
    <span className="text-slate-500">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
)
