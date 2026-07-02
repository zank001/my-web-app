import { CheckCircle2, ClipboardCheck, Lock, ShieldCheck, Undo2, XCircle } from 'lucide-react'
import { useState } from 'react'
import Card from '../components/Card'
import { RequestKindBadge, RequestStatusBadge } from '../components/Badges'
import { actions, useStore } from '../data/store'
import { approvalMatrix, docCode, formatDate, relativeTime } from '../lib/format'
import { can } from '../lib/permissions'
import type { DocLevel, DocRequest, User } from '../types'

/** คิวงานศูนย์คุณภาพ: ตรวจสอบ (ข้อ 6.1) และเสนอผู้มีอำนาจอนุมัติ (ข้อ 6.2) */
export default function Approvals() {
  const requests = useStore((s) => s.requests)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  const active = requests.filter((r) => r.status === 'submitted' || r.status === 'reviewed' || r.status === 'needs_fix')
  const done = requests.filter((r) => r.status === 'approved' || r.status === 'rejected')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ตรวจสอบ & อนุมัติคำขอ</h1>
        <p className="text-sm text-slate-500">
          คิวคำขอจาก FM-QMR-001 · ตรวจสอบความซ้ำซ้อนโดยศูนย์คุณภาพ แล้วเสนอผู้มีอำนาจลงนามตามระดับเอกสาร
        </p>
      </div>

      {active.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-400">ไม่มีคำขอค้างดำเนินการ</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {active.map((r) => <RequestCard key={r.id} req={r} me={me} />)}
        </div>
      )}

      <Card title="ประวัติคำขอที่ปิดแล้ว">
        <ul className="divide-y divide-slate-100">
          {done.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <RequestKindBadge kind={r.kind} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{r.title}</div>
                <div className="text-xs text-slate-500">
                  {r.level}-{r.deptCode} · เสนอโดย {r.proposer} · {relativeTime(r.submittedAt)}
                  {r.decidedBy ? ` · ตัดสินโดย ${r.decidedBy}` : ''}
                </div>
              </div>
              <RequestStatusBadge status={r.status} />
            </li>
          ))}
          {done.length === 0 && <li className="py-6 text-center text-sm text-slate-400">ยังไม่มีประวัติ</li>}
        </ul>
      </Card>
    </div>
  )
}

function RequestCard({ req, me }: { req: DocRequest; me?: User }) {
  const docs = useStore((s) => s.documents)
  const depts = useStore((s) => s.departments)
  const [comment, setComment] = useState('')
  const target = docs.find((d) => d.id === req.targetDocId)
  const dept = depts.find((d) => d.code === req.deptCode)
  const matrix = approvalMatrix[(req.level === 'EXT' ? 'SOP' : req.level) as Exclude<DocLevel, 'EXT'>]
  const role = me?.role
  const canReview = role ? can.reviewRequest(role) : false
  const canApprove = role ? can.approve(role, req.level) : false

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RequestKindBadge kind={req.kind} />
            <span className="font-semibold">{req.title}</span>
            <RequestStatusBadge status={req.status} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            ระดับ {req.level} · {dept?.nameTh ?? req.deptCode} · เสนอโดย {req.proposer} ({req.proposerPosition}) · {relativeTime(req.submittedAt)}
          </div>
          {target && (
            <div className="mt-1 text-xs text-slate-500">
              เอกสารเป้าหมาย: <span className="font-mono font-semibold text-brand-700">{docCode(target)}</span> (มีผล {formatDate(target.effectiveDate)})
            </div>
          )}
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="text-xs font-semibold text-slate-500">เหตุผล: </span>{req.reason}
          </p>
          {req.qcComment && (
            <p className="mt-2 text-xs text-slate-500">
              <ShieldCheck size={12} className="mr-1 inline text-brand-600" />
              ความเห็นศูนย์คุณภาพ ({req.qcBy}): {req.qcComment}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        {req.status === 'submitted' && (
          canReview ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">
                ขั้นตอนที่ 1 — ศูนย์คุณภาพตรวจสอบความซ้ำซ้อน/รูปแบบ (ผู้ตรวจสอบ: {matrix.review})
              </div>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ความเห็นการตรวจสอบ…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => actions.qcReview(req.id, true, comment || 'ตรวจสอบแล้ว ไม่ต้องแก้ไขเอกสาร')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  <ClipboardCheck size={16} /> ตรวจสอบผ่าน — เสนอลงนาม
                </button>
                <button
                  onClick={() => actions.qcReview(req.id, false, comment || 'ตรวจสอบแล้ว ต้องแก้ไขเอกสาร')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                >
                  <Undo2 size={16} /> ส่งกลับแก้ไข
                </button>
              </div>
            </div>
          ) : (
            <LockedNote text={`รอศูนย์คุณภาพตรวจสอบความซ้ำซ้อน/รูปแบบ (${matrix.review})`} />
          )
        )}

        {req.status === 'reviewed' && (
          canApprove ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">
                ขั้นตอนที่ 2 — ผู้มีอำนาจลงนาม: <span className="text-slate-700">{matrix.approve}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => actions.approveRequest(req.id, me?.name ?? matrix.approve)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={16} />
                  {req.kind === 'new' ? 'อนุมัติ — ขึ้นทะเบียนเอกสารควบคุม' : req.kind === 'revise' ? 'อนุมัติ — ออกฉบับแก้ไขใหม่' : 'อนุมัติ — ประทับตรายกเลิก'}
                </button>
                <button
                  onClick={() => actions.rejectRequest(req.id, me?.name ?? matrix.approve, 'ไม่อนุมัติ')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <XCircle size={16} /> ไม่อนุมัติ
                </button>
              </div>
              <div className="text-[11px] text-slate-400">
                เมื่ออนุมัติ ระบบจะออกรหัส ลงบัญชี FM-QMR-002 และบันทึกประวัติการแก้ไขให้อัตโนมัติ
              </div>
            </div>
          ) : (
            <LockedNote text={`ตรวจสอบผ่านแล้ว — รอผู้มีอำนาจลงนาม: ${matrix.approve}`} />
          )
        )}

        {req.status === 'needs_fix' && (
          <div className="text-xs text-amber-700">
            รอผู้เสนอปรับแก้เอกสารตามความเห็นศูนย์คุณภาพ แล้วยื่นคำขอใหม่อีกครั้ง
          </div>
        )}
      </div>
    </Card>
  )
}

const LockedNote = ({ text }: { text: string }) => (
  <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
    <Lock size={13} /> {text} · คุณไม่มีสิทธิ์ดำเนินการขั้นนี้
  </div>
)
