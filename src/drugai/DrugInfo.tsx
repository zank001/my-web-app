import {
  AlertTriangle, Check, ClipboardList, Copy, HelpCircle, KeyRound, Loader2,
  Pill, Plus, Search, ShieldAlert, Sparkles, Trash2,
} from 'lucide-react'
import { useState } from 'react'
import AiSettings from '../components/AiSettings'
import Card from '../components/Card'
import { hasApiKey } from '../lib/ai'
import {
  aiDrugInteractions, aiDrugMonograph, aiDrugQA, aiPatientLeaflet, severityLabel,
  type DrugMonograph, type InteractionReport, type InteractionSeverity,
} from '../lib/drugAi'

/**
 * ข้อมูลยา (AI) — ผู้ช่วยสืบค้นข้อมูลยาด้วย Generative AI สำหรับบุคลากร
 * 4 โหมด: ข้อมูลยา · ตรวจยาตีกัน · คำแนะนำผู้ป่วย · ถาม-ตอบ
 */

type Mode = 'info' | 'interactions' | 'leaflet' | 'qa'

const MODES: { key: Mode; label: string; icon: typeof Pill }[] = [
  { key: 'info',         label: 'ข้อมูลยา',        icon: Pill },
  { key: 'interactions', label: 'ตรวจยาตีกัน',     icon: ShieldAlert },
  { key: 'leaflet',      label: 'คำแนะนำผู้ป่วย',  icon: ClipboardList },
  { key: 'qa',           label: 'ถาม-ตอบเรื่องยา', icon: HelpCircle },
]

const RECENT_KEY = 'qmr_drug_recent'
const loadRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[] } catch { return [] }
}

const severityBadge: Record<InteractionSeverity, string> = {
  major: 'bg-rose-100 text-rose-700',
  moderate: 'bg-amber-100 text-amber-700',
  minor: 'bg-emerald-100 text-emerald-700',
}

export default function DrugInfo() {
  const [mode, setMode] = useState<Mode>('info')
  const [showKey, setShowKey] = useState(false)
  // busy/error ผูกกับโหมดที่สั่งงาน เพื่อไม่ให้สถานะรั่วไปโชว์ในโหมดอื่น
  const [busy, setBusy] = useState<Mode | null>(null)
  const [err, setErr] = useState<{ mode: Mode; msg: string } | null>(null)

  // โหมดข้อมูลยา — monoFor คือชื่อที่ค้นจริง (input อาจถูกแก้ระหว่างรอ)
  const [drugQuery, setDrugQuery] = useState('')
  const [monoFor, setMonoFor] = useState('')
  const [mono, setMono] = useState<DrugMonograph | null>(null)
  const [recent, setRecent] = useState<string[]>(loadRecent)

  // โหมดตรวจยาตีกัน — reportFor คือรายการที่ใช้ตรวจจริง
  const [drugList, setDrugList] = useState<string[]>(['', ''])
  const [reportFor, setReportFor] = useState<string[]>([])
  const [report, setReport] = useState<InteractionReport | null>(null)

  // โหมดคำแนะนำผู้ป่วย — leafletFor คือชื่อยาตอนที่สร้าง
  const [leafletDrug, setLeafletDrug] = useState('')
  const [leafletNote, setLeafletNote] = useState('')
  const [leafletFor, setLeafletFor] = useState('')
  const [leaflet, setLeaflet] = useState('')
  const [copied, setCopied] = useState(false)

  // โหมดถาม-ตอบ
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const runAi = async (m: Mode, fn: () => Promise<void>) => {
    if (!hasApiKey()) { setShowKey(true); return }
    setErr(null); setBusy(m)
    try { await fn() } catch (e) { setErr({ mode: m, msg: e instanceof Error ? e.message : 'AI ผิดพลาด' }) }
    finally { setBusy(null) }
  }

  const lookup = (name: string) => {
    const q = name.trim()
    if (!q) return
    setDrugQuery(q)
    void runAi('info', async () => {
      setMono(null)
      setMonoFor(q)
      const m = await aiDrugMonograph(q)
      setMono(m)
      if (!m.unknown) {
        const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 8)
        setRecent(next)
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      }
    })
  }

  const checkInteractions = () => {
    const names = drugList.map((d) => d.trim()).filter(Boolean)
    void runAi('interactions', async () => {
      setReport(null)
      setReportFor(names)
      setReport(await aiDrugInteractions(names))
    })
  }

  const makeLeaflet = () => {
    const name = leafletDrug.trim()
    void runAi('leaflet', async () => {
      setLeaflet('')
      setLeafletFor(name)
      setLeaflet(await aiPatientLeaflet(name, leafletNote))
    })
  }

  const ask = () => void runAi('qa', async () => {
    setAnswer('')
    setAnswer(await aiDrugQA(question))
  })

  const copyLeaflet = async () => {
    try {
      await navigator.clipboard.writeText(`${leaflet}\n\n(เอกสารนี้ร่างด้วยระบบ AI — ต้องผ่านการตรวจทานโดยเภสัชกรก่อนใช้งาน)`)
      setErr(null)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { setErr({ mode: 'leaflet', msg: 'คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาต' }) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ข้อมูลยา (AI)</h1>
          <p className="text-sm text-slate-500">สืบค้นข้อมูลยา ตรวจสอบยาตีกัน และร่างคำแนะนำการใช้ยา ด้วย Generative AI</p>
        </div>
        <button onClick={() => setShowKey((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
          <KeyRound size={14} /> ตั้งค่า AI {hasApiKey() ? '✓' : ''}
        </button>
      </div>

      {/* คงคอมโพเนนต์ไว้ตอนซ่อน เพื่อไม่ทิ้งค่า key/โมเดลที่พิมพ์ค้างไว้ */}
      <div className={showKey ? undefined : 'hidden'}>
        <AiSettings onSaved={() => setShowKey(false)} />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>
          ข้อมูลที่สร้างโดย AI เป็นข้อมูลอ้างอิงเบื้องต้นและอาจคลาดเคลื่อนได้ —
          ต้องตรวจสอบกับเภสัชกร เอกสารกำกับยา หรือแหล่งอ้างอิงมาตรฐานก่อนนำไปใช้กับผู้ป่วยจริงทุกครั้ง
        </span>
      </div>

      {/* แถบเลือกโหมด */}
      <div className="flex flex-wrap gap-2">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ' +
              (mode === key ? 'bg-brand-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
            }
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {err?.mode === mode && <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{err.msg}</div>}

      {/* ---------- โหมด 1: ข้อมูลยา ---------- */}
      {mode === 'info' && (
        <div className="space-y-6">
          <Card>
            <form onSubmit={(e) => { e.preventDefault(); lookup(drugQuery) }} className="flex flex-wrap gap-3">
              <div className="relative min-w-64 flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)}
                  placeholder="ชื่อยา เช่น Paracetamol, Warfarin, Enalapril หรือชื่อการค้า…"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button type="submit" disabled={busy === 'info' || !drugQuery.trim()} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300">
                {busy === 'info' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} ค้นข้อมูลยา
              </button>
            </form>
            {recent.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">ค้นล่าสุด:</span>
                {recent.map((r) => (
                  <button key={r} onClick={() => lookup(r)} disabled={busy === 'info'} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-brand-50 hover:text-brand-700">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {mono?.unknown && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>AI ไม่แน่ใจว่า "{monoFor}" เป็นยาอะไร {mono.note && `— ${mono.note}`} ลองตรวจสอบตัวสะกดหรือใช้ชื่อสามัญ</span>
            </div>
          )}

          {mono && !mono.unknown && (
            <div className="space-y-6">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{mono.genericName}</h2>
                      {mono.highAlert && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                          <ShieldAlert size={12} /> ยาความเสี่ยงสูง (High-Alert)
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">ผลการค้นหา: {monoFor}</p>
                    {mono.tradeNames.length > 0 && (
                      <p className="mt-1 text-sm text-slate-500">ชื่อการค้า: {mono.tradeNames.join(', ')}</p>
                    )}
                    {mono.drugClass && <p className="mt-1 text-sm text-slate-600">{mono.drugClass}</p>}
                  </div>
                </div>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <MonoSection title="ข้อบ่งใช้" items={mono.indications} />
                <MonoText title="ขนาดและวิธีใช้ทั่วไป" text={mono.dosage} />
                <MonoSection title="ข้อห้ามใช้" items={mono.contraindications} tone="rose" />
                <MonoSection title="อาการไม่พึงประสงค์" items={mono.sideEffects} />
                <MonoSection title="ข้อควรระวัง" items={mono.precautions} tone="amber" />
                <MonoSection title="ปฏิกิริยาระหว่างยา/อาหารที่สำคัญ" items={mono.interactions} tone="amber" />
                <MonoText title="หญิงตั้งครรภ์ / ให้นมบุตร" text={mono.pregnancy} />
                <MonoText title="การเก็บรักษา" text={mono.storage} />
              </div>
              {mono.note && <p className="text-xs text-slate-500">หมายเหตุ: {mono.note}</p>}
            </div>
          )}
        </div>
      )}

      {/* ---------- โหมด 2: ตรวจยาตีกัน ---------- */}
      {mode === 'interactions' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="รายการยาที่ใช้ร่วมกัน" className="lg:col-span-1">
            <form onSubmit={(e) => { e.preventDefault(); checkInteractions() }}>
              <div className="space-y-2">
                {drugList.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={d}
                      onChange={(e) => setDrugList((ds) => ds.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`ยาตัวที่ ${i + 1}`}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    />
                    {drugList.length > 2 && (
                      <button type="button" onClick={() => setDrugList((ds) => ds.filter((_, j) => j !== i))} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setDrugList((ds) => [...ds, ''])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand-300 hover:text-brand-600">
                  <Plus size={13} /> เพิ่มยา
                </button>
              </div>
              <button
                type="submit"
                disabled={busy === 'interactions' || drugList.filter((d) => d.trim()).length < 2}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
              >
                {busy === 'interactions' ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />} ตรวจสอบปฏิกิริยาระหว่างยา
              </button>
            </form>
            <p className="mt-2 text-[11px] text-slate-400">ระบุยาอย่างน้อย 2 รายการ ใช้ชื่อสามัญจะแม่นยำกว่าชื่อการค้า</p>
          </Card>

          <div className="space-y-4 lg:col-span-2">
            {report && (
              <>
                <p className="text-xs text-slate-400">ผลการตรวจสำหรับ: {reportFor.join(' · ')}</p>
                {report.unknownDrugs.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      AI ไม่รู้จักรายการต่อไปนี้ว่าเป็นยา: <span className="font-semibold">{report.unknownDrugs.join(', ')}</span> —
                      ผลการตรวจนี้ไม่ครอบคลุมรายการดังกล่าว โปรดตรวจสอบตัวสะกดหรือใช้ชื่อสามัญ
                    </span>
                  </div>
                )}
                {report.summary && (
                  <Card title="สรุปภาพรวม"><p className="text-sm text-slate-700">{report.summary}</p></Card>
                )}
                {report.interactions.length === 0 ? (
                  report.unknownDrugs.length === 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      ไม่พบปฏิกิริยาระหว่างยาที่มีนัยสำคัญจากการวิเคราะห์ของ AI — โปรดยืนยันกับฐานข้อมูลมาตรฐานอีกครั้ง
                    </div>
                  )
                ) : (
                  report.interactions.map((it, i) => (
                    <Card key={i}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{it.pair[0]}{it.pair[1] ? ` × ${it.pair[1]}` : ''}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${severityBadge[it.severity]}`}>
                          {severityLabel[it.severity]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{it.effect}</p>
                      {it.advice && (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          <span className="font-semibold text-slate-700">การจัดการ: </span>{it.advice}
                        </p>
                      )}
                    </Card>
                  ))
                )}
              </>
            )}
            {!report && busy !== 'interactions' && (
              <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 py-16 text-sm text-slate-400">
                กรอกรายการยาแล้วกดตรวจสอบ ผลจะแสดงที่นี่
              </div>
            )}
            {busy === 'interactions' && !report && (
              <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
            )}
          </div>
        </div>
      )}

      {/* ---------- โหมด 3: คำแนะนำผู้ป่วย ---------- */}
      {mode === 'leaflet' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="สร้างคำแนะนำการใช้ยา" className="lg:col-span-1">
            <form onSubmit={(e) => { e.preventDefault(); makeLeaflet() }} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">ชื่อยา</label>
                <input
                  value={leafletDrug} onChange={(e) => setLeafletDrug(e.target.value)}
                  placeholder="เช่น Amoxicillin 500 mg"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">ข้อมูลเพิ่มเติม (ไม่บังคับ)</label>
                <textarea
                  value={leafletNote} onChange={(e) => setLeafletNote(e.target.value)} rows={3}
                  placeholder="เช่น กิน 1 เม็ด วันละ 3 ครั้ง หลังอาหาร นาน 7 วัน"
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                type="submit" disabled={busy === 'leaflet' || !leafletDrug.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
              >
                {busy === 'leaflet' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} ร่างคำแนะนำผู้ป่วย
              </button>
              <p className="text-[11px] text-slate-400">ภาษาง่ายสำหรับผู้ป่วยทั่วไป ให้เภสัชกรตรวจทานก่อนพิมพ์แจก</p>
            </form>
          </Card>

          <div className="lg:col-span-2">
            {leaflet ? (
              <Card
                title={`คำแนะนำการใช้ยา — ${leafletFor}`}
                action={
                  <button onClick={copyLeaflet} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                    {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}
                  </button>
                }
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{leaflet}</div>
              </Card>
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
                {busy === 'leaflet' ? <Loader2 className="animate-spin text-slate-400" /> : 'คำแนะนำที่ร่างแล้วจะแสดงที่นี่'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- โหมด 4: ถาม-ตอบ ---------- */}
      {mode === 'qa' && (
        <div className="space-y-6">
          <Card title="ถามเรื่องยา">
            <textarea
              value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
              placeholder="เช่น ยา Ceftriaxone ผสมกับ NSS แล้วคงตัวได้กี่ชั่วโมง / ผู้ป่วยไตวายต้องปรับขนาด Metformin อย่างไร"
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={ask} disabled={busy === 'qa' || !question.trim()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
            >
              {busy === 'qa' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} ถาม AI
            </button>
          </Card>
          {answer && (
            <Card title="คำตอบ">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{answer}</div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

const MonoSection = ({ title, items, tone }: { title: string; items: string[]; tone?: 'rose' | 'amber' }) => {
  if (!items.length) return null
  const dot = tone === 'rose' ? 'bg-rose-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-brand-400'
  return (
    <Card title={title}>
      <ul className="space-y-1.5 text-sm text-slate-700">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

const MonoText = ({ title, text }: { title: string; text: string }) => {
  if (!text.trim()) return null
  return (
    <Card title={title}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>
    </Card>
  )
}
