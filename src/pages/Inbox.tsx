import { CheckCircle2, FileText } from 'lucide-react'
import { useState } from 'react'
import Card from '../components/Card'
import { AckBadge, LevelBadge } from '../components/Badges'
import { actions, useStore } from '../data/store'
import { docCode, formatDate, relativeTime } from '../lib/format'
import { can } from '../lib/permissions'
import type { Distribution, DistributionRecipient, QualityDocument } from '../types'

export default function Inbox() {
  const depts = useStore((s) => s.departments)
  const docs = useStore((s) => s.documents)
  const dists = useStore((s) => s.distributions)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))
  const canSwitch = me ? can.viewAnyInbox(me.role) : false
  const [pickedDept, setPickedDept] = useState(me?.deptCode ?? 'OPD')
  // ผู้ใช้ทั่วไป/ประธาน เห็นเฉพาะกล่องของหน่วยตนเอง · ศูนย์คุณภาพ/ผอ. สลับดูได้ทุกหน่วย
  const viewDept = canSwitch ? pickedDept : (me?.deptCode ?? 'OPD')
  const setViewDept = setPickedDept

  const inbox = dists
    .map((d) => ({ dist: d, recipient: d.recipients.find((r) => r.deptCode === viewDept) }))
    .filter((x): x is { dist: Distribution; recipient: DistributionRecipient } => Boolean(x.recipient))
    .sort((a, b) => +new Date(b.dist.sentAt) - +new Date(a.dist.sentAt))

  const pending = inbox.filter((x) => x.recipient.status !== 'acknowledged')
  const acknowledged = inbox.filter((x) => x.recipient.status === 'acknowledged')
  const dept = depts.find((d) => d.code === viewDept)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">กล่องรับเอกสาร</h1>
          <p className="text-sm text-slate-500">
            มุมมองหน่วยงานปลายทาง — เปิดอ่านและลงนามรับทราบเอกสารที่ QMR แจกจ่าย
          </p>
        </div>
        {canSwitch ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">ดูในฐานะ</span>
            <select
              value={viewDept}
              onChange={(e) => setViewDept(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
            >
              {depts.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.nameTh}</option>)}
            </select>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-xs text-slate-500">หน่วยงานของคุณ:</span>{' '}
            <span className="font-mono font-semibold text-brand-700">{dept?.code}</span>{' '}
            <span className="text-slate-600">{dept?.nameTh}</span>
          </div>
        )}
      </div>

      {inbox.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-slate-400">
            ยังไม่มีเอกสารแจกจ่ายถึง {dept?.nameTh ?? viewDept}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              รอลงนามรับทราบ
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{pending.length}</span>
            </h2>
            {pending.length === 0 ? (
              <Card>
                <div className="py-6 text-center text-sm text-emerald-600">
                  ✓ {dept?.nameTh ?? viewDept} ลงนามรับทราบครบทุกฉบับแล้ว
                </div>
              </Card>
            ) : (
              <ul className="space-y-3">
                {pending.map(({ dist, recipient }) => {
                  const doc = docs.find((d) => d.id === dist.documentId)
                  if (!doc) return null
                  return <InboxItem key={`${dist.id}-${viewDept}`} dist={dist} doc={doc} recipient={recipient} />
                })}
              </ul>
            )}
          </section>

          {acknowledged.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                ลงนามรับทราบแล้ว
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{acknowledged.length}</span>
              </h2>
              <ul className="space-y-3">
                {acknowledged.map(({ dist, recipient }) => {
                  const doc = docs.find((d) => d.id === dist.documentId)
                  if (!doc) return null
                  return <InboxItem key={`${dist.id}-${viewDept}`} dist={dist} doc={doc} recipient={recipient} />
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function InboxItem({
  dist, doc, recipient,
}: { dist: Distribution; doc: QualityDocument; recipient: DistributionRecipient }) {
  const [signing, setSigning] = useState(false)
  const [signature, setSignature] = useState('')
  const [note, setNote] = useState('')
  const acked = recipient.status === 'acknowledged'

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-brand-700">{docCode(doc)}</span>
              <span className="font-medium text-slate-800">{doc.title}</span>
              <LevelBadge level={doc.level} />
            </div>
            <div className="text-xs text-slate-500">
              แจกจ่ายโดย {dist.sentBy} · {relativeTime(dist.sentAt)} · ลงนามภายใน {formatDate(dist.dueAt)}
            </div>
            <div className="mt-1 text-sm text-slate-700">{dist.message}</div>
          </div>
        </div>
        <AckBadge status={recipient.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={() => actions.markOpened(dist.id, recipient.deptCode)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          เปิดอ่านเอกสาร
        </button>
        {!acked ? (
          <button
            onClick={() => setSigning(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <CheckCircle2 size={16} /> ลงนามรับทราบ
          </button>
        ) : (
          recipient.acknowledgedAt && (
            <div className="text-xs text-emerald-700">
              ลงนามรับทราบโดย <span className="font-semibold">{recipient.signature}</span> · {relativeTime(recipient.acknowledgedAt)}
              {recipient.note ? ` · หมายเหตุ: ${recipient.note}` : ''}
            </div>
          )
        )}
      </div>

      {signing && !acked && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="grid gap-2 md:grid-cols-2">
            <input
              value={signature} onChange={(e) => setSignature(e.target.value)}
              placeholder="ชื่อ-ตำแหน่งผู้ลงนามรับทราบ"
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
            <button
              onClick={() => { actions.acknowledge(dist.id, recipient.deptCode, signature, note || undefined); setSigning(false) }}
              disabled={!signature.trim()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
            >
              ยืนยันการลงนาม
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
