import { Activity, CheckCircle2, Clock, FileText, Send, TrendingUp } from 'lucide-react'
import Card from '../components/Card'
import { AckBadge } from '../components/Badges'
import { useStore } from '../data/store'
import { formatDate, relativeTime } from '../lib/format'
import type { Page } from '../components/Sidebar'

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const docs = useStore((s) => s.documents)
  const dists = useStore((s) => s.distributions)
  const acts = useStore((s) => s.activities)
  const depts = useStore((s) => s.departments)

  const totalRecipients = dists.reduce((n, d) => n + d.recipients.length, 0)
  const acked = dists.reduce((n, d) => n + d.recipients.filter((r) => r.status === 'acknowledged').length, 0)
  const pending = dists.reduce((n, d) => n + d.recipients.filter((r) => r.status === 'pending' || r.status === 'opened').length, 0)
  const overdue = dists.reduce((n, d) => n + d.recipients.filter((r) => r.status === 'overdue').length, 0)
  const ackRate = totalRecipients ? Math.round((acked / totalRecipients) * 100) : 0

  const recent = [...dists].sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)).slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">แดชบอร์ด QMR</h1>
          <p className="text-sm text-slate-500">ภาพรวมการส่งและรับทราบเอกสารคุณภาพ</p>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          + สร้างเอกสารใหม่
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={FileText} label="เอกสารทั้งหมด" value={docs.length} color="bg-violet-100 text-violet-700" />
        <Stat icon={Send} label="ส่งออกแล้ว" value={dists.length} color="bg-brand-100 text-brand-700" />
        <Stat icon={CheckCircle2} label="อัตรารับทราบ" value={`${ackRate}%`} sub={`${acked}/${totalRecipients} ผู้รับ`} color="bg-emerald-100 text-emerald-700" />
        <Stat icon={Clock} label="เกินกำหนด" value={overdue} sub={`รอ ${pending} รายการ`} color="bg-rose-100 text-rose-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="การกระจายล่าสุด" action={<button onClick={() => onNavigate('distribution')} className="text-xs font-semibold text-brand-600 hover:underline">ดูทั้งหมด →</button>} className="lg:col-span-2">
          <ul className="divide-y divide-slate-100">
            {recent.map((d) => {
              const doc = docs.find((x) => x.id === d.documentId)
              const ack = d.recipients.filter((r) => r.status === 'acknowledged').length
              const pct = Math.round((ack / d.recipients.length) * 100)
              return (
                <li key={d.id} className="flex items-center gap-4 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Send size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{doc?.code} · {doc?.title}</div>
                    <div className="text-xs text-slate-500">
                      ส่งเมื่อ {formatDate(d.sentAt)} · ครบกำหนด {formatDate(d.dueAt)} · {d.recipients.length} หน่วยงาน
                    </div>
                  </div>
                  <div className="w-40">
                    <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                      <span>รับทราบ</span><span>{pct}%</span>
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

        <Card title="กิจกรรมล่าสุด">
          <ul className="space-y-3">
            {acts.slice(0, 6).map((a) => (
              <li key={a.id} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <Activity size={14} />
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

      <Card title="สถานะรับทราบรายหน่วยงาน" action={<span className="inline-flex items-center gap-1 text-xs text-slate-500"><TrendingUp size={14}/> รวมทุกเอกสาร</span>}>
        <div className="grid gap-3 md:grid-cols-2">
          {depts.map((d) => {
            const recs = dists.flatMap((x) => x.recipients).filter((r) => r.departmentId === d.id)
            const ack = recs.filter((r) => r.status === 'acknowledged').length
            const pct = recs.length ? Math.round((ack / recs.length) * 100) : 0
            const overdueN = recs.filter((r) => r.status === 'overdue').length
            return (
              <div key={d.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{d.nameTh} <span className="text-xs text-slate-400">({d.code})</span></div>
                    <div className="text-[11px] text-slate-500">{d.head} · {d.memberCount} คน</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{pct}%</div>
                    <div className="text-[11px] text-slate-500">{ack}/{recs.length}</div>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                {overdueN > 0 && (
                  <div className="mt-2">
                    <AckBadge status="overdue" /> <span className="text-[11px] text-slate-500">{overdueN} รายการ</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function Stat({
  icon: Icon, label, value, sub, color,
}: { icon: typeof FileText; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${color}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  )
}
