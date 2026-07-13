import {
  CheckCircle2, CornerUpLeft, Download, Eye, FileText, FileUp, KeyRound, Loader2,
  Plus, Send, Sparkles, Trash2, Wand2, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import AiSettings from '../components/AiSettings'
import Card from '../components/Card'
import paiLogoUrl from '../assets/pai-logo.png'
import paiLogoSmUrl from '../assets/pai-logo-sm.png'
import { actions, nextSeq, useStore } from '../data/store'
import { docCode } from '../lib/format'
import { aiDraftSection, aiSuggestFlow, hasApiKey } from '../lib/ai'
import { extractDocxText, restructureDocument } from '../lib/importDoc'
import { buildSopDocx, downloadBlob, type DocxImage, type SopSectionContent, type SopSignatory } from '../lib/docxTemplate'
import { kindLabel, renderFlowSvg, svgToPng, type FlowNode, type NodeKind } from '../lib/flowchart'
import type { DocLevel } from '../types'

const LEVEL_META: Record<Exclude<DocLevel, 'EXT'>, { th: string; en: string }> = {
  QM: { th: 'คู่มือคุณภาพ', en: 'Quality Manual (QM)' },
  SOP: { th: 'แนวทางปฏิบัติ', en: 'Standard Operating Procedure (SOP)' },
  WI: { th: 'วิธีปฏิบัติงาน', en: 'Work Instruction (WI)' },
  FM: { th: 'แบบฟอร์ม', en: 'Form (FM)' },
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

/** โหลดไฟล์ asset (ตราโรงพยาบาลปายที่ฝังมากับระบบ) เป็น Uint8Array */
const fetchAsset = async (url: string): Promise<Uint8Array> =>
  new Uint8Array(await (await fetch(url)).arrayBuffer())

/** บรรทัดระดับเอกสารในหัวกระดาษ เช่น "คู่มือคุณภาพ (Quality Manual)" */
const headerLevelLine = (meta: { th: string; en: string }) =>
  `${meta.th} (${meta.en.replace(/\s*\((?:QM|SOP|WI|FM)\)$/, '')})`

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
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  // นำเข้าเอกสารเดิมมาจัดรูปแบบตามแม่แบบ
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importText, setImportText] = useState('')
  const [importInfo, setImportInfo] = useState('')
  const [importedCode, setImportedCode] = useState<string | null>(null)

  // หน้าปก & ผู้ลงนาม
  const [ownerLine, setOwnerLine] = useState('')
  const [orgLine, setOrgLine] = useState('') // ตราจริงมีชื่อโรงพยาบาลอยู่แล้ว — เว้นว่างได้
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoCm, setLogoCm] = useState(8.2) // เอกสารจริงใช้ ~8.17 ซม.
  const [preparedNo, setPreparedNo] = useState(1)
  const [signatories, setSignatories] = useState<SopSignatory[]>([
    { role: 'ผู้จัดทำ', name: me?.name ?? '', position: me?.position ?? '' },
    { role: 'ผู้ทบทวน', name: '', position: '' },
    { role: 'ผู้อนุมัติ', name: '', position: '' },
  ])

  const dept = depts.find((d) => d.code === deptCode)
  // ใช้รหัสเดิมจากเอกสารที่นำเข้า (ถ้ามี) — ไม่งั้นออกรหัสใหม่จากลำดับถัดไป
  const autoCode = useMemo(
    () => docCode({ level, deptCode, seq: nextSeq(level, deptCode), revision: 1 }),
    [level, deptCode],
  )
  const code = importedCode ?? autoCode
  const revision = Number(importedCode?.match(/-(\d{1,2})$/)?.[1] ?? 1)
  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : paiLogoUrl), [logoFile])

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

  /** นำเข้าเอกสารเดิม → แยกเนื้อหาเข้าหัวข้อมาตรฐาน แล้วเติมลงฟอร์มให้ตรวจแก้ */
  const runImport = () => runAi(async () => {
    let text = importText.trim()
    if (importFile) {
      text = importFile.name.toLowerCase().endsWith('.docx')
        ? extractDocxText(await importFile.arrayBuffer())
        : await importFile.text()
    }
    const r = await restructureDocument(text)
    if (r.title) setTitle(r.title)
    setBodies((b) => ({ ...b, ...r.sections }))
    if (r.level) setLevel(r.level)
    if (r.deptCode && depts.some((d) => d.code === r.deptCode)) setDeptCode(r.deptCode)
    setImportedCode(r.code ?? null)
    const n = Object.keys(r.sections).length
    setImportInfo(
      `${r.method === 'ai' ? 'AI จัดหมวดให้แล้ว' : 'จัดหมวดด้วยตัวช่วยพื้นฐาน (AI ไม่พร้อมใช้งาน)'} — เติม ${n} หัวข้อ` +
      (r.title ? ` · ชื่อเรื่อง: ${r.title.slice(0, 40)}` : '') +
      (r.code ? ` · ใช้รหัสเดิม ${r.code}` : ''),
    )
  }, 'import')

  const aiFlow = () => runAi(async () => {
    const steps = await aiSuggestFlow(title || 'กระบวนการปฏิบัติงาน', bodies.procedure)
    const ids = steps.map(() => uid())
    setNodes(steps.map((s, i) => ({
      id: ids[i], kind: s.kind as NodeKind, text: s.text,
      loopTo: s.loopToIndex != null && s.loopToIndex < steps.length && s.loopToIndex !== i
        ? ids[s.loopToIndex] : undefined,
    })))
  }, 'flow')

  /** ประกอบข้อมูลทั้งหมดแล้วสร้างไฟล์ Word เป็น Blob (ใช้ร่วมกันทั้งดาวน์โหลดและพรีวิว) */
  const buildBlob = async (): Promise<Blob> => {
    const meta = LEVEL_META[level]
    const owner = ownerLine.trim() || dept?.nameTh || deptCode
    const sections: SopSectionContent[] = SECTIONS.map((s) => ({ label: s.label, body: bodies[s.key] ?? '' }))

    // แผนผัง flowchart → รูปในภาคผนวก
    let flowPng
    if (nodes.filter((n) => n.text.trim()).length >= 2) {
      const { svg, width, height } = renderFlowSvg(nodes)
      const data = await svgToPng(svg, width, height)
      flowPng = { data, width, height }
    }

    // ตราโรงพยาบาล: ใช้ไฟล์ที่แนบ หรือตราโรงพยาบาลปายจริงที่ฝังมากับระบบ
    let logo: DocxImage
    let headerLogo: DocxImage
    if (logoFile) {
      const buf = new Uint8Array(await logoFile.arrayBuffer())
      logo = { data: buf, type: logoFile.type.includes('jpeg') || logoFile.type.includes('jpg') ? 'jpg' : 'png' }
      headerLogo = logo
    } else {
      logo = { data: await fetchAsset(paiLogoUrl), type: 'png' }
      headerLogo = { data: await fetchAsset(paiLogoSmUrl), type: 'png' }
    }

    return buildSopDocx({
      levelTitleTh: meta.th, levelTitleEn: meta.en,
      headerLevelLine: headerLevelLine(meta), code,
      title: title || '(ยังไม่ระบุชื่อเรื่อง)',
      ownerLine: owner, orgLine: orgLine.trim() || undefined,
      revision, preparedNo,
      effectiveDate: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: 'long', year: 'numeric' }),
      signatories: signatories.filter((s) => s.role.trim() || s.name.trim()),
      logo, logoCm, headerLogo,
      sections, flowPng,
    })
  }

  const buildDoc = async (): Promise<void> => {
    setErr(''); setBusy('docx')
    try {
      downloadBlob(await buildBlob(), `${code}_ร่าง.docx`)
    } catch (e) { setErr(e instanceof Error ? e.message : 'สร้างไฟล์ไม่สำเร็จ') }
    finally { setBusy(null) }
  }

  // พรีวิวไฟล์ Word ในเบราว์เซอร์ — เรนเดอร์จากไฟล์ .docx จริงตัวเดียวกับที่ดาวน์โหลด
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!previewOpen) return
    let cancelled = false
    ;(async () => {
      setErr(''); setBusy('preview')
      try {
        const blob = await buildBlob()
        const { renderAsync } = await import('docx-preview')
        if (cancelled || !previewRef.current) return
        previewRef.current.innerHTML = ''
        await renderAsync(await blob.arrayBuffer(), previewRef.current, undefined, {
          breakPages: true, renderHeaders: true, renderFooters: true, ignoreLastRenderedPageBreak: true,
        })
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'สร้างตัวอย่างไม่สำเร็จ')
      } finally {
        if (!cancelled) setBusy(null)
      }
    })()
    return () => { cancelled = true }
    // ต้องการให้เรนเดอร์เฉพาะตอนเปิดหน้าต่างพรีวิว (ข้อมูลถูกอ่านสดใน buildBlob)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewOpen])

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

      {/* คงคอมโพเนนต์ไว้ตอนซ่อน เพื่อไม่ทิ้งค่า key/โมเดลที่พิมพ์ค้างไว้ */}
      <div className={showKey ? undefined : 'hidden'}>
        <AiSettings onSaved={() => setShowKey(false)} />
      </div>

      {err && <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ซ้าย: เนื้อหา */}
        <div className="space-y-6 lg:col-span-2">
          <Card title={<span className="flex items-center gap-2"><FileUp size={15} className="text-brand-600" /> นำเข้าเอกสารที่มีอยู่แล้ว — จัดรูปแบบตามแม่แบบอัตโนมัติ</span>}>
            <p className="mb-3 text-[11px] text-slate-400">
              แนบไฟล์เอกสารที่พิมพ์เองไว้ (.docx / .txt) หรือวางเนื้อหา แล้วระบบจะแยกเข้าหัวข้อมาตรฐาน 1-7
              ตรวจจับรหัส/ระดับเอกสารให้ และจัดหน้า Word ใหม่ทั้งเล่มตามแม่แบบจริง (ปก · หัวกระดาษ · ฟอนต์ · ตารางลงนาม)
              — ตารางในเนื้อหาจะแสดงเป็นบรรทัด <span className="font-mono">| คั่นเซลล์ |</span> (<span className="font-mono">¶</span> = ขึ้นบรรทัดใหม่ในเซลล์) และกลับเป็นตารางจริงในไฟล์ Word
            </p>
            <div className="grid gap-3">
              <input
                type="file" accept=".docx,.txt"
                onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportInfo('') }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700"
              />
              <textarea
                value={importText} onChange={(e) => { setImportText(e.target.value); setImportInfo('') }} rows={3}
                className={inputCls + ' resize-y'} placeholder="…หรือวางเนื้อหาเอกสารทั้งฉบับที่นี่ (ใช้เมื่อไม่ได้แนบไฟล์)"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={runImport} disabled={busy === 'import' || (!importFile && !importText.trim())}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
                >
                  {busy === 'import' ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                  จัดรูปแบบตามแม่แบบ
                </button>
                {importInfo && (
                  <>
                    <button
                      onClick={() => setPreviewOpen(true)} disabled={busy === 'preview'}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-400"
                    >
                      {busy === 'preview' ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                      ดูตัวอย่าง
                    </button>
                    <button
                      onClick={buildDoc} disabled={busy === 'docx'}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
                    >
                      {busy === 'docx' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                      ดาวน์โหลด Word (.docx)
                    </button>
                  </>
                )}
              </div>
              {importInfo && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  ✓ {importInfo} — ตรวจแก้เนื้อหาในหัวข้อด้านล่างก่อนดาวน์โหลดได้
                </div>
              )}
              {importedCode && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  ใช้รหัสเดิมจากเอกสาร: <span className="font-mono font-semibold text-brand-700">{importedCode}</span>
                  <button onClick={() => setImportedCode(null)} title="กลับไปออกรหัสใหม่"
                    className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                    <X size={12} />
                  </button>
                  <span className="text-slate-400">(กด ✕ เพื่อออกรหัสใหม่ {autoCode})</span>
                </div>
              )}
            </div>
          </Card>

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
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="เช่น การเบิกจ่ายยาเสพติดให้โทษและวัตถุออกฤทธิ์" />
              </Field>
            </div>
          </Card>

          <Card title="หน้าปก & ผู้ลงนาม">
            <div className="grid grid-cols-2 gap-4">
              <Field label="บรรทัดใต้ตรา (คณะกรรมการ/หน่วยงาน)" className="col-span-2">
                <input value={ownerLine} onChange={(e) => setOwnerLine(e.target.value)} className={inputCls} placeholder={dept?.nameTh ?? 'เช่น คณะกรรมการเภสัชกรรมบำบัด'} />
              </Field>
              <Field label="บรรทัดชื่อองค์กร (เว้นว่างได้ — ตรามีชื่อโรงพยาบาลอยู่แล้ว)">
                <input value={orgLine} onChange={(e) => setOrgLine(e.target.value)} className={inputCls} placeholder="เช่น โรงพยาบาลปาย" />
              </Field>
              <Field label="จัดทำครั้งที่ (แสดงในหัวกระดาษ)">
                <input type="number" min={1} value={preparedNo} onChange={(e) => setPreparedNo(Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
              </Field>
              <Field label={`ขนาดตราหน้าปก (ซม.) — ${logoCm.toFixed(1)}`}>
                <input type="range" min={5} max={9} step={0.1} value={logoCm} onChange={(e) => setLogoCm(Number(e.target.value))} className="w-full accent-brand-600" />
              </Field>
              <Field label="ตราเอกสาร" className="col-span-2">
                <div className="flex items-center gap-3">
                  <img src={logoPreview} alt="ตราโรงพยาบาล" className="h-16 w-16 shrink-0 rounded-lg border border-slate-100 object-contain p-1" />
                  <div className="min-w-0 flex-1">
                    <input type="file" accept="image/png,image/jpeg" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700" />
                    <div className="mt-1 text-[11px] text-slate-400">
                      {logoFile ? <span className="text-emerald-600">ใช้ตราที่แนบ: {logoFile.name}</span> : 'ใช้ตราโรงพยาบาลปายจริงให้อัตโนมัติ (ทั้งหน้าปกและหัวกระดาษ) — แนบไฟล์หากต้องการตราอื่น'}
                    </div>
                  </div>
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">ตารางลงนาม (ผู้จัดทำ/ทบทวน/อนุมัติ)</span>
                <button
                  type="button"
                  onClick={() => setSignatories((s) => [...s, { role: 'ผู้ทบทวน', name: '', position: '' }])}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-brand-300 hover:text-brand-600"
                >
                  <Plus size={12} /> เพิ่มผู้ลงนาม
                </button>
              </div>
              <div className="space-y-2">
                {signatories.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 items-center gap-1.5">
                    <select
                      value={s.role}
                      onChange={(e) => setSignatories((arr) => arr.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                      className="col-span-3 rounded-lg border border-slate-200 px-1.5 py-1.5 text-xs outline-none focus:border-brand-400"
                    >
                      {['ผู้จัดทำ', 'ผู้ทบทวน', 'ผู้อนุมัติ'].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <input
                      value={s.name} placeholder="ชื่อ-สกุล"
                      onChange={(e) => setSignatories((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="col-span-4 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                    />
                    <input
                      value={s.position} placeholder="ตำแหน่ง"
                      onChange={(e) => setSignatories((arr) => arr.map((x, j) => j === i ? { ...x, position: e.target.value } : x))}
                      className="col-span-4 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                    />
                    <button type="button" onClick={() => setSignatories((arr) => arr.filter((_, j) => j !== i))}
                      className="col-span-1 grid h-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
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
                <div key={n.id}>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={n.kind}
                      onChange={(e) => setNodes((ns) => ns.map((x) => x.id === n.id ? { ...x, kind: e.target.value as NodeKind, loopTo: e.target.value === 'decision' ? x.loopTo : undefined } : x))}
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
                  {n.kind === 'decision' && (
                    <div className="mt-1 flex items-center gap-1.5 pl-2 text-[11px] text-slate-500">
                      <CornerUpLeft size={12} className="shrink-0 text-amber-500" /> เมื่อไม่ผ่าน วนกลับไป
                      <select
                        value={n.loopTo ?? ''}
                        onChange={(e) => setNodes((ns) => ns.map((x) => x.id === n.id ? { ...x, loopTo: e.target.value || undefined } : x))}
                        className="min-w-0 flex-1 rounded-md border border-slate-200 px-1.5 py-1 text-[11px] outline-none focus:border-brand-400"
                      >
                        <option value="">— ไม่มีเส้นวนกลับ —</option>
                        {nodes.map((x, j) => x.id !== n.id && (
                          <option key={x.id} value={x.id}>ขั้นที่ {j + 1} — {(x.text || kindLabel[x.kind]).slice(0, 30)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setNodes((ns) => [...ns, { id: uid(), kind: 'process', text: '' }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:border-brand-300 hover:text-brand-600">
                <Plus size={13} /> เพิ่มขั้นตอน
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-slate-100 bg-white p-2 [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: flow.svg }} />
          </Card>

          <Card title="สรุป & ดาวน์โหลด">
            <div className="space-y-1.5 text-sm">
              <Row label="รหัสที่จะได้" value={<span className="font-mono font-semibold text-brand-700">{code}</span>} />
              <Row label="หัวข้อที่กรอกแล้ว" value={`${filled}/${SECTIONS.length}`} />
              <Row label="ขั้นตอนในผัง" value={`${nodes.filter((n) => n.text.trim()).length}`} />
            </div>
            <button onClick={() => setPreviewOpen(true)} disabled={busy === 'preview'} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:text-slate-400">
              {busy === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} ดูตัวอย่างเอกสาร
            </button>
            <button onClick={buildDoc} disabled={busy === 'docx'} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
              {busy === 'docx' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} ดาวน์โหลด Word (.docx)
            </button>
            <button onClick={submit} disabled={!title.trim()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300">
              <Send size={16} /> ส่งเข้าระบบขอขึ้นทะเบียน
            </button>
            <p className="mt-2 flex items-start gap-1 text-[11px] text-slate-400">
              <FileText size={12} className="mt-0.5 shrink-0" />
              ไฟล์ Word ตามแม่แบบเอกสารจริง: หน้าปก + ตราโรงพยาบาลปาย · หัวกระดาษทุกหน้าพร้อมเลขหน้าอัตโนมัติ · บันทึกการแก้ไข · ภาคผนวก Flow chart
            </p>
          </Card>
        </div>
      </div>

      {/* หน้าต่างตัวอย่างไฟล์ Word — เรนเดอร์จาก .docx ตัวเดียวกับที่จะดาวน์โหลด */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 p-3 sm:p-6" onClick={() => setPreviewOpen(false)}>
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-slate-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Eye size={15} className="text-brand-600" /> ตัวอย่างไฟล์ Word — <span className="font-mono text-brand-700">{code}</span>
              </span>
              <div className="flex items-center gap-2">
                <button onClick={buildDoc} disabled={busy === 'docx'} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
                  {busy === 'docx' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} ดาวน์โหลด
                </button>
                <button onClick={() => setPreviewOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>
            </div>
            {busy === 'preview' && (
              <div className="flex items-center justify-center gap-2 bg-white/80 py-8 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> กำลังสร้างตัวอย่างเอกสาร…
              </div>
            )}
            <div ref={previewRef} className="min-h-0 flex-1 overflow-auto [&_.docx-wrapper]:bg-transparent [&_.docx-wrapper]:p-4 [&_.docx-wrapper>section]:mb-4 [&_.docx-wrapper>section]:shadow-lg" />
          </div>
        </div>
      )}
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
