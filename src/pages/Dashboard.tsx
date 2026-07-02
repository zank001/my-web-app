import { Activity as ActivityIcon, CheckCircle2, ClipboardCheck, FileText, Flame, Send } from 'lucide-react'
import Card from '../components/Card'
import { LevelBadge, RequestKindBadge, RequestStatusBadge } from '../components/Badges'
import { useStore } from '../data/store'
import { docCode, formatDate, relativeTime } from '../lib/format'
import type { Page } from '../components/Sidebar'

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const docs = useStore((s) => s.documents)
  const requests = useStore((s) => s.requests)
  const dists = useStore((s) => s.distributions)
  const acts = useStore((s) => s.activities)

  const controlled = docs.filter((d) => d.status === 'controlled')
  const cancelled = docs.filter((d) => d.status === 'cancelled')
  const pendingReqs = requests.filter((r) => r.status === 'submitted' || r.status === 'reviewed')

  const allRecipients = dists.flatMap((d) => d.recipients)
  const acked = allRecipients.filter((r) => r.status === 'acknowledged').length
  const overdue = allRecipients.filter((r) => r.status === 'overdue').length
  const ackRate = allRecipients.length ? Math.round((acked / allRecipients.length) * 100) : 0

  const recentDists = [...dists].sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)).slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">แดชบอร์ดศูนย์คุณภาพ</h1>
          <p className="text-sm text-slate-500">ระบบควบคุมเอกสารคุณภาพตาม QM-QMR-001-1 · โรงพยาบาลปาย</p>
        </div>
        <button
          onClick={() => onNavigate('request')}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          + ยื่นใบขอขึ้นทะเบียน (FM-QMR-001)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={FileText} label="เอกสารควบคุม" value={controlled.length} sub={`ทั้งหมด ${docs.length} รายการในบัญชี`} color="bg-emerald-100 text-emerald-700" onClick={() => onNavigate('register')} />
        <Stat icon={ClipboardCheck} label="คำขอรอดำเนินการ" value={pendingReqs.length} sub="ตรวจสอบ/รอลงนาม" color="bg-amber-100 text-amber-700" onClick={() => onNavigate('approvals')} />
        <Stat icon={CheckCircle2} label="อัตรารับทราบ" value={`${ackRate}%`} sub={`${acked}/${allRecipients.length} หน่วยรับ · เกินกำหนด ${overdue}`} color="bg-brand-100 text-brand-700" onClick={() => onNavigate('distribution')} />
        <Stat icon={Flame} label="ยกเลิก รอทำลาย" value={cancelled.length} sub="เก็บ 1 ปีนับจากวันยกเลิก" color="bg-rose-100 text-rose-700" onClick={() => onNavigate('register')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="คำขอล่าสุด (FM-QMR-001)"
          action={<button onClick={() => onNavigate('approvals')} className="text-xs font-semibold text-brand-600 hover:underline">ไปที่คิวอนุมัติ →</button>}
          className="lg:col-span-2"
        >
          <ul className="divide-y divide-slate-100">
            {requests.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <RequestKindBadge kind={r.kind} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.level}-{r.deptCode} · {r.proposer} · {relativeTime(r.submittedAt)}</div>
                </div>
                <RequestStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="กิจกรรมล่าสุด">
          <ul className="space-y-3">
            {acts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <ActivityIcon size={14} />
                </div>
                <div className="text-sm leading-snug">
                  <div><span className="font-semibold">{a.actorName}</span> <span className="text-slate-500">{a.action}</span></div>
                  <div className="text-slate-700">{a.target}</div>
                  <div className="text-[11px] text-slate-400">{relativeTime(a.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="การแจกจ่ายล่าสุด"
        action={<button onClick={() => onNavigate('distribution')} className="text-xs font-semibold text-brand-600 hover:underline">ดูทั้งหมด →</button>}
      >
        <ul className="divide-y divide-slate-100">
          {recentDists.map((d) => {
            const doc = docs.find((x) => x.id === d.documentId)
            if (!doc) return null
            const ack = d.recipients.filter((r) => r.status === 'acknowledged').length
            const pct = Math.round((ack / d.recipients.length) * 100)
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-4 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <Send size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-mono font-bold text-brand-700">{docCode(doc)}</span>
                    <span className="font-medium">{doc.title}</span>
                    <LevelBadge level={doc.level} />
                  </div>
                  <div className="text-xs text-slate-500">
                    ส่ง {formatDate(d.sentAt)} · ครบกำหนด {formatDate(d.dueAt)} · {d.recipients.length} หน่วยงาน
                  </div>
                </div>
                <div className="w-44">
                  <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                    <span>รับทราบ {ack}/{d.recipients.length}</span><span>{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon, label, value, sub, color, onClick,
}: { icon: typeof FileText; label: string; value: string | number; sub?: string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-200 hover:shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </button>
  )
}
