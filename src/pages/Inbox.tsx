import { CheckCircle2, FileText } from 'lucide-react'
import { useState } from 'react'
import Card from '../components/Card'
import { AckBadge, PriorityBadge, TypeBadge } from '../components/Badges'
import { actions, useStore } from '../data/store'
import { formatDate, relativeTime } from '../lib/format'

export default function Inbox() {
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))
  const myDeptId = me?.departmentId
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  // For the demo, the QMR user views the inbox of dept IPD to exercise the acknowledge flow.
  const viewDeptId = me?.role === 'qmr' ? 'd-ipd' : myDeptId
  const viewDept = depts.find((d) => d.id === viewDeptId)

  const inbox = useStore((s) =>
    s.distributions
      .map((d) => ({
        dist: d,
        recipient: d.recipients.find((r) => r.departmentId === viewDeptId),
      }))
      .filter((x) => x.recipient)
      .sort((a, b) => +new Date(b.dist.sentAt) - +new Date(a.dist.sentAt)),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">กล่องรับเอกสาร</h1>
        <p className="text-sm text-slate-500">
          มุมมองในฐานะ <span className="font-semibold">{viewDept?.nameTh}</span> ({viewDept?.code}) ·
          ผู้รับ: <span className="font-semibold">{viewDept?.head}</span>
        </p>
      </div>

      <ul className="space-y-3">
        {inbox.map(({ dist, recipient }) => {
          const doc = docs.find((d) => d.id === dist.documentId)
          if (!doc || !recipient) return null
          return <InboxItem key={dist.id} dist={dist} doc={doc} recipient={recipient} />
        })}
      </ul>
    </div>
  )
}

function InboxItem({
  dist, doc, recipient,
}: {
  dist: import('../types').Distribution
  doc: import('../types').QualityDocument
  recipient: import('../types').DistributionRecipient
}) {
  const [signing, setSigning] = useState(false)
  const [signature, setSignature] = useState('')
  const [note, setNote] = useState('')
  const acked = recipient.status === 'acknowledged'

  const onOpen = () => {
    if (recipient.status === 'pending') {
      actions.markOpened(dist.id, recipient.departmentId)
    }
  }
  const onAck = () => {
    if (!signature.trim()) return
    actions.acknowledge(dist.id, recipient.departmentId, signature, note)
    setSigning(false); setSignature(''); setNote('')
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{doc.code}</span>
              <span className="text-slate-700">{doc.title}</span>
              <TypeBadge type={doc.type} />
              <PriorityBadge p={doc.priority} />
            </div>
            <div className="text-xs text-slate-500">
              ส่งโดย QMR · {relativeTime(dist.sentAt)} · ครบกำหนด {formatDate(dist.dueAt)} · v{doc.version}
            </div>
            <div className="mt-1 text-sm text-slate-700">{dist.message}</div>
          </div>
        </div>
        <AckBadge status={recipient.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button onClick={onOpen} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
          เปิดอ่านเอกสาร
        </button>
        {!acked && (
          <button onClick={() => setSigning(true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
            <CheckCircle2 size={16} /> ลงนามรับทราบ
          </button>
        )}
        {acked && recipient.acknowledgedAt && (
          <div className="text-xs text-emerald-700">
            ลงนามรับทราบโดย <span className="font-semibold">{recipient.signature}</span> · {relativeTime(recipient.acknowledgedAt)}
          </div>
        )}
      </div>

      {signing && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={signature} onChange={(e) => setSignature(e.target.value)}
              placeholder="ชื่อผู้ลงนามรับทราบ"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <input
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="หมายเหตุ (ถ้ามี)"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setSigning(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">ยกเลิก</button>
            <button onClick={onAck} disabled={!signature.trim()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300">
              ยืนยันรับทราบ
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
