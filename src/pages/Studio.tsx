import {
  CheckCircle2, Download, FileText, KeyRound, Loader2, Plus, Send,
  Sparkles, Trash2, Wand2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { actions, nextSeq, useStore } from '../data/store'
import { docCode } from '../lib/format'
import {
  aiDraftSection, aiSuggestFlow, defaultModel, getApiKey, getModel, getProvider,
  hasApiKey, providerKeyHint, providerLabel, providers, setApiKey, setModel, setProvider,
  type AiProvider,
} from '../lib/ai'
import { buildSopDocx, downloadBlob, type SopSectionContent } from '../lib/docxTemplate'
import { kindLabel, renderFlowSvg, svgToPng, type FlowNode, type NodeKind } from '../lib/flowchart'
import type { DocLevel } from '../types'

const LEVEL_META: Record<Exclude<DocLevel, 'EXT'>, { th: string; en: string }> = {
  QM: { th: 'คู่มือคุณภาพ', en: 'Quality Manual' },
  SOP: { th: 'แนวทางปฏิบัติ', en: 'Standard Operating Procedure' },
  WI: { th: 'วิธีปฏิบัติงาน', en: 'Work Instruction' },
  FM: { th: 'แบบฟอร์ม', en: 'Form' },
}

const SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'objective', label: 'วัตถุประสงค์', hint: 'อธิบายเหตุผลและเป้าหมายของเอกสาร ว่าจัดทำเพื่อควบคุมหรือกำหนดแนวปฏิบัติใด' },
  { key: 'scope', label: 'ขอบเขต', hint: 'ระบุขอบเขตการใช้งาน เช่น ใช้กับหน่วยงานใด ขั้นตอนใด หรือบุคลากรกลุ่มใด' },
  { key: 'responsibility', label: 'หน้าที่และความรับผิดชอบ', hint: 'แจกแจงบทบาทของแต่ละตำแหน่ง ว่าใครต้องทำอะไร ตรวจสอบ หรืออนุมัติ' },
  { key: 'definition', label: 'คำจำกัดความ', hint: 'ให้ความหมายของคำเฉพาะ คำเทคนิค หรือคำย่อที่ใช้ในเอกสาร' },
  { key: 'procedure', label: 'รายละเอียด/ขั้นตอนการปฏิบัติ', hint: 'ขั้นตอนการทำงานเรียงลำดับตั้งแต่ต้นจนจบ กระชับและปฏิบัติตามได้ทันที' },
  { key: 'reference', label: 'เอกสารอ้างอิง', hint: 'กฎหมาย มาตรฐาน แนวปฏิบัติ หรือเอกสารภายในที่เกี่ยวข้อง' },
  { key: 'appendix', label: 'ภาคผนวก', hint: 'แบบฟอร์ม ตาราง ผังงาน ตัวอย่าง หรือข้อมูลเสริม (แผนผังด้านล่างจะถูกแนบให้อัตโนมัติ)' },
]

const uid = () => Math.random().toString(36).slice(2, 8)

export default function Studio({ onDone }: { onDone: () => void }) {
  const depts = useStore((s) => s.departments)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  const [level, setLevel] = useState<Exclude<DocLevel, 'EXT'>>('SOP')
  const [deptCode, setDeptCode] = useState(me?.deptCode ?? 'QMR')
  const [title, setTitle] = useState('')
  const [bodies, setBodies] = useState<Record<string, string>>({})
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: uid(), kind: 'start', text: 'เริ่มต้น' },
    { id: uid(), kind: 'process', text: '' },
    { id: uid(), kind: 'end', text: 'สิ้นสุด' },
  ])
  const [busy, setBusy] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [prov, setProv] = useState<AiProvider>(getProvider())
  const [keyInput, setKeyInput] = useState(getApiKey())
  const [modelInput, setModelInput] = useState(getModel())
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  // สลับผู้ให้บริการ → โหลด key/โมเดลของเจ้านั้นมาแสดง
  const pickProvider = (p: AiProvider) => {
    setProv(p)
    setKeyInput(getApiKey(p))
    setModelInput(getModel(p))
  }
  const saveAiSettings = () => {
    setProvider(prov)
    setApiKey(prov, keyInput)
    setModel(prov, modelInput)
    setShowKey(false)
  }

  const dept = depts.find((d) => d.code === deptCode)
  const code = useMemo(
    () => docCode({ level, deptCode, seq: nextSeq(level, deptCode), revision: 1 }),
    [level, deptCode],
  )

  const setBody = (k: string, v: string) => setBodies((b) => ({ ...b, [k]: v }))

  const runAi = async (fn: () => Promise<void>, tag: string) => {
    if (!hasApiKey()) { setShowKey(true); return }
    setErr(''); setBusy(tag)
    try { await fn() } catch (e) { setErr(e instanceof Error ? e.message : 'AI ผิดพลาด') }
    finally { setBusy(null) }
  }

  const aiSection = (s: typeof SECTIONS[number]) => runAi(async () => {
    const text = await aiDraftSection({
      level, title: title || '(ยังไม่ระบุชื่อเรื่อง)', deptName: dept?.nameTh ?? deptCode,
      sectionLabel: s.label, sectionHint: s.hint, current: bodies[s.key],
    })
    setBody(s.key, text)
  }, `sec-${s.key}`)

  const aiFlow = () => runAi(async () => {
    const steps = await aiSuggestFlow(title || 'กระบวนการปฏิบัติงาน')
    setNodes([
      { id: uid(), kind: 'start', text: 'เริ่มต้น' },
      ...steps.map((t) => ({ id: uid(), kind: 'process' as NodeKind, text: t })),
      { id: uid(), kind: 'end', text: 'สิ้นสุด' },
    ])
  }, 'flow')

  const buildDoc = async (): Promise<void> => {
    setErr(''); setBusy('docx')
    try {
      const meta = LEVEL_META[level]
      const sections: SopSectionContent[] = SECTIONS.map((s) => ({ label: s.label, body: bodies[s.key] ?? '' }))
      let flowPng
      const realNodes = nodes.filter((n) => n.text.trim())
      if (realNodes.length >= 2) {
        const { svg, width, height } = renderFlowSvg(nodes)
        const data = await svgToPng(svg, width, height)
        flowPng = { data, width, height }
      }
      const blob = await buildSopDocx({
        levelTitleTh: meta.th, levelTitleEn: meta.en, code,
        title: title || '(ยังไม่ระบุชื่อเรื่อง)', orgName: dept?.nameTh ?? deptCode,
        revision: 1, preparedBy: me?.name ?? '', reviewedBy: '', approvedBy: '',
        effectiveDate: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }),
        sections, flowPng,
      })
      downloadBlob(blob, `${code}_ร่าง.docx`)
    } catch (e) { setErr(e instanceof Error ? e.message : 'สร้างไฟล์ไม่สำเร็จ') }
    finally { setBusy(null) }
  }

  const submit = () => {
    actions.submitRequest({
      kind: 'new', level, deptCode, title: title || '(ยังไม่ระบุชื่อเรื่อง)',
      reason: bodies.objective || 'ร่างผ่านสตูดิโอช่วยเขียนเอกสาร',
      proposer: me?.name ?? '', proposerPosition: me?.position ?? '',
    })
    setSubmitted(true)
  }

  const flow = renderFlowSvg(nodes)
  const filled = SECTIONS.filter((s) => (bodies[s.key] ?? '').trim()).length

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-xl font-bold">ส่งคำขอเข้าระบบแล้ว</h1>
        <p className="mt-2 text-sm text-slate-500">
          ร่างเอกสาร <span className="font-mono font-semibold">{code}</span> ถูกส่งเข้าคิวศูนย์คุณภาพเพื่อตรวจสอบ
          อย่าลืมดาวน์โหลดไฟล์ Word แนบส่งพร้อมไฟล์ข้อมูลที่ศูนย์คุณภาพ
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={buildDoc} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">ดาวน์โหลด Word อีกครั้ง</button>
          <button onClick={onDone} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">ไปหน้าตรวจสอบ & อนุมัติ</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">สตูดิโอช่วยร่างเอกสาร</h1>
          <p className="text-sm text-slate-500">กรอกทีละหัวข้อ ให้ AI ช่วยร่าง สร้างแผนผัง แล้วดาวน์โหลดเป็น Word จัดหน้าตามแม่แบบ</p>
        </div>
        <button onClick={() => setShowKey((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
          <KeyRound size={14} /> ตั้งค่า AI {hasApiKey() ? '✓' : ''}
        </button>
      </div>

      {showKey && (
        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">ผู้ให้บริการ AI</label>
              <select
                value={prov}
                onChange={(e) => pickProvider(e.target.value as AiProvider)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              >
                {providers.map((p) => <option key={p} value={p}>{providerLabel[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">โมเดล</label>
              <input
                value={modelInput} onChange={(e) => setModelInput(e.target.value)}
                placeholder={defaultModel[prov]}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">API key ของ {providerLabel[prov]}</label>
              <div className="flex flex-wrap items-end gap-3">
                <input
                  value={keyInput} onChange={(e) => setKeyInput(e.target.value)} type="password"
                  placeholder={providerKeyHint[prov]}
                  className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button onClick={saveAiSettings} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">บันทึก</button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            เลือกเจ้า AI แล้วใส่ key ของเจ้านั้น · key เก็บแยกกันในเบราว์เซอร์ของคุณเท่านั้น (localStorage) · โมเดลเว้นว่างได้ (ใช้ค่าเริ่มต้น) · เว็บสาธิตจึงเรียก AI ฝั่งผู้ใช้
          </p>
        </Card>
      )}

      {err && <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ซ้าย: เนื้อหา */}
        <div className="space-y-6 lg:col-span-2">
          <Card title="ข้อมูลเอกสาร">
            <div className="grid grid-cols-2 gap-4">
              <Field label="ระดับเอกสาร">
                <select value={level} onChange={(e) => setLevel(e.target.value as Exclude<DocLevel, 'EXT'>)} className={inputCls}>
                  {(Object.keys(LEVEL_META) as Array<Exclude<DocLevel, 'EXT'>>).map((l) => (
                    <option key={l} value={l}>{l} — {LEVEL_META[l].th}</option>
                  ))}
                </select>
              </Field>
              <Field label="หน่วยงาน/คณะกรรมการ">
                <select value={deptCode} onChange={(e) => setDeptCode(e.target.value)} className={inputCls}>
                  {depts.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.nameTh}</option>)}
                </select>
              </Field>
              <Field label="ชื่อเรื่อง" className="col-span-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="เช่น แนวทางปฏิบัติเพื่อป้องกันความคลาดเคลื่อนในการวินิจฉัย" />
              </Field>
            </div>
          </Card>

          {SECTIONS.map((s, i) => (
            <Card
              key={s.key}
              title={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{i + 1}</span>{s.label}</span>}
              action={
                <button onClick={() => aiSection(s)} disabled={busy === `sec-${s.key}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline disabled:text-slate-400">
                  {busy === `sec-${s.key}` ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {bodies[s.key]?.trim() ? 'ปรับด้วย AI' : 'ช่วยร่างด้วย AI'}
                </button>
              }
            >
              <p className="mb-2 text-[11px] text-slate-400">{s.hint}</p>
              <textarea
                value={bodies[s.key] ?? ''} onChange={(e) => setBody(s.key, e.target.value)} rows={4}
                className={inputCls + ' resize-y'} placeholder="พิมพ์เนื้อหา หรือกดช่วยร่างด้วย AI…"
              />
            </Card>
          ))}
        </div>

        {/* ขวา: แผนผัง + สรุป + ดาวน์โหลด */}
        <div className="space-y-6">
          <Card
            title={<span className="flex items-center gap-2"><Wand2 size={15} className="text-brand-600" /> แผนผังขั้นตอน</span>}
            action={
              <button onClick={aiFlow} disabled={busy === 'flow'} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline disabled:text-slate-400">
                {busy === 'flow' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} AI เสนอขั้นตอน
              </button>
            }
          >
            <div className="space-y-2">
              {nodes.map((n, i) => (
                <div key={n.id} className="flex items-center gap-1.5">
                  <select
                    value={n.kind}
                    onChange={(e) => setNodes((ns) => ns.map((x) => x.id === n.id ? { ...x, kind: e.target.value as NodeKind } : x))}
                    className="rounded-lg border border-slate-200 px-1.5 py-1.5 text-xs outline-none focus:border-brand-400"
                  >
                    {(['start', 'process', 'decision', 'end'] as NodeKind[]).map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}
                  </select>
                  <input
                    value={n.text}
                    onChange={(e) => setNodes((ns) => ns.map((x) => x.id === n.id ? { ...x, text: e.target.value } : x))}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                    placeholder={`ขั้นที่ ${i + 1}`}
                  />
                  <button onClick={() => setNodes((ns) => ns.filter((x) => x.id !== n.id))} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => setNodes((ns) => [...ns, { id: uid(), kind: 'process', text: '' }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand-300 hover:text-brand-600">
                <Plus size={13} /> เพิ่มขั้นตอน
              </button>
            </div>
            <div className="mt-4 overflow-auto rounded-lg border border-slate-100 bg-white p-2" dangerouslySetInnerHTML={{ __html: flow.svg }} />
          </Card>

          <Card title="สรุป & ดาวน์โหลด">
            <div className="space-y-1.5 text-sm">
              <Row label="รหัสที่จะได้" value={<span className="font-mono font-semibold text-brand-700">{code}</span>} />
              <Row label="หัวข้อที่กรอกแล้ว" value={`${filled}/${SECTIONS.length}`} />
              <Row label="ขั้นตอนในผัง" value={`${nodes.filter((n) => n.text.trim()).length}`} />
            </div>
            <button onClick={buildDoc} disabled={busy === 'docx'} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
              {busy === 'docx' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} ดาวน์โหลด Word (.docx)
            </button>
            <button onClick={submit} disabled={!title.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300">
              <Send size={16} /> ส่งเข้าระบบขอขึ้นทะเบียน
            </button>
            <p className="mt-2 flex items-start gap-1 text-[11px] text-slate-400">
              <FileText size={12} className="mt-0.5 shrink-0" />
              ไฟล์ Word จัดหน้า A4 · TH Sarabun New 16 · ขอบ 1.91/2.54 ซม. ตามภาคผนวก 7.5
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}>
    <label className="mb-1 block text-xs font-semibold text-slate-600">{label}</label>
    {children}
  </div>
)
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
    <span className="text-slate-500">{label}</span><span className="font-semibold">{value}</span>
  </div>
)
