import { CheckCircle2, FileUp, Info, Loader2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { actions, nextSeq, useStore } from '../data/store'
import { approvalMatrix, docCode, levelLabel, requestKindLabel } from '../lib/format'
import { detectCode, extractDocxAllText, extractDocxText, heuristicSplit } from '../lib/importDoc'
import type { DocLevel, RequestKind } from '../types'

/** แบบฟอร์มดิจิทัลแทน FM-QMR-001 — ใบขอขึ้นทะเบียนใหม่/ปรับปรุงแก้ไข/ยกเลิก */
export default function RequestForm({ onDone }: { onDone: () => void }) {
  const depts = useStore((s) => s.departments)
  const docs = useStore((s) => s.documents)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  const [kind, setKind] = useState<RequestKind>('new')
  const [level, setLevel] = useState<Exclude<DocLevel, 'EXT'>>('SOP')
  const [deptCode, setDeptCode] = useState('QMR')
  const [targetDocId, setTargetDocId] = useState('')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [proposer, setProposer] = useState(me?.name ?? '')
  const [position, setPosition] = useState(me?.position ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importInfo, setImportInfo] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const controlledDocs = useMemo(
    () => docs.filter((d) => d.status === 'controlled' && d.level !== 'EXT'),
    [docs],
  )
  const targetDoc = docs.find((d) => d.id === targetDocId)

  /** แนบไฟล์แล้วเติมฟอร์มให้อัตโนมัติจากเนื้อหาไฟล์ (.docx/.txt) */
  const onAttach = async (f: File | null) => {
    setFile(f)
    setImportInfo('')
    if (!f) return
    const lower = f.name.toLowerCase()
    if (!lower.endsWith('.docx') && !lower.endsWith('.txt')) {
      setImportInfo('แนบไฟล์แล้ว — การเติมอัตโนมัติรองรับเฉพาะ .docx และ .txt (ไฟล์ PDF ยังต้องกรอกเอง)')
      return
    }
    setImporting(true)
    try {
      let text: string
      let meta: ReturnType<typeof detectCode> = {}
      if (lower.endsWith('.docx')) {
        const buf = await f.arrayBuffer()
        text = extractDocxText(buf)
        // รหัสเอกสาร/ระดับ มักอยู่ในตารางลงนาม/หัวกระดาษที่เนื้อหาหลักตัดออก — อ่านจากข้อความทั้งไฟล์
        meta = detectCode(extractDocxAllText(buf))
      } else {
        text = await f.text()
        meta = detectCode(text)
      }
      const r = heuristicSplit(text)
      const level = meta.level ?? r.level
      const deptCode = meta.deptCode ?? r.deptCode
      const objective = r.sections.objective?.trim()
      const filled: string[] = []

      if (kind === 'new') {
        if (level) { setLevel(level); filled.push('ระดับเอกสาร') }
        if (deptCode && depts.some((d) => d.code === deptCode)) { setDeptCode(deptCode); filled.push('หน่วยงาน') }
        if (r.title) { setTitle(r.title); filled.push('ชื่อเรื่อง') }
      } else {
        // ปรับปรุง/ยกเลิก: จับคู่รหัสในไฟล์กับเอกสารควบคุมที่มีอยู่ (ไม่สนครั้งที่แก้ไข)
        const base = (c: string) => c.replace(/-\d+$/, '')
        const match = meta.code ? controlledDocs.find((d) => base(docCode(d)) === base(meta.code!)) : undefined
        if (match) { setTargetDocId(match.id); filled.push(`เอกสาร ${docCode(match)}`) }
      }

      if (objective) { setReason(objective); filled.push('เหตุผล (จากวัตถุประสงค์)') }
      setImportInfo(filled.length
        ? `เติมให้แล้ว: ${filled.join(' · ')} — ตรวจแก้ก่อนส่งได้`
        : 'อ่านไฟล์แล้ว แต่ไม่พบข้อมูลที่จับคู่ได้อัตโนมัติ กรุณากรอกเอง')
    } catch (e) {
      setImportInfo(e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ')
    } finally {
      setImporting(false)
    }
  }

  // ตัวอย่างรหัสที่ระบบจะออกให้เมื่ออนุมัติ (ลำดับถัดไปของระดับ+หน่วยงาน)
  const previewCode = kind === 'new'
    ? docCode({ level, deptCode, seq: nextSeq(level, deptCode), revision: 1 })
    : targetDoc
      ? kind === 'revise'
        ? docCode({ ...targetDoc, revision: targetDoc.revision + 1 })
        : docCode(targetDoc)
      : '—'

  const matrix = approvalMatrix[kind === 'new' ? level : (targetDoc?.level as Exclude<DocLevel, 'EXT'> | undefined) ?? level]

  const canSubmit =
    reason.trim() && proposer.trim() &&
    (kind === 'new' ? title.trim() : Boolean(targetDoc))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    actions.submitRequest({
      kind,
      level: kind === 'new' ? level : (targetDoc?.level ?? level),
      deptCode: kind === 'new' ? deptCode : (targetDoc?.deptCode ?? deptCode),
      title: kind === 'new' ? title : (targetDoc?.title ?? ''),
      reason,
      targetDocId: kind === 'new' ? undefined : targetDocId,
      proposer,
      proposerPosition: position,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-xl font-bold">ส่งคำขอเรียบร้อย</h1>
        <p className="mt-2 text-sm text-slate-500">
          คำขอถูกส่งเข้าคิวของศูนย์คุณภาพเพื่อตรวจสอบความซ้ำซ้อนและความถูกต้อง
          ตามขั้นตอนข้อ 6.1 ของ QM-QMR-001 จากนั้นจะเสนอ{matrix.approve}ลงนาม
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => { setSubmitted(false); setTitle(''); setReason('') }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            ยื่นคำขอเพิ่ม
          </button>
          <button onClick={onDone} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            ไปหน้าตรวจสอบ & อนุมัติ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ใบขอขึ้นทะเบียนใหม่ / ปรับปรุงแก้ไข / ยกเลิก เอกสารคุณภาพ</h1>
        <p className="text-sm text-slate-500">แบบฟอร์มดิจิทัลตาม FM-QMR-001 · ส่งถึงศูนย์คุณภาพโดยอัตโนมัติ</p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="ส่วนผู้เสนอ">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ประเภทคำขอ" className="md:col-span-2">
                <div className="flex gap-2">
                  {(['new', 'revise', 'cancel'] as RequestKind[]).map((k) => (
                    <button
                      key={k} type="button" onClick={() => setKind(k)}
                      className={
                        'flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ' +
                        (kind === k
                          ? k === 'cancel'
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-brand-400 bg-brand-50 text-brand-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50')
                      }
                    >
                      {requestKindLabel[k]}
                    </button>
                  ))}
                </div>
              </Field>

              {kind === 'new' ? (
                <>
                  <Field label="ระดับของเอกสาร">
                    <select value={level} onChange={(e) => setLevel(e.target.value as Exclude<DocLevel, 'EXT'>)} className={inputCls}>
                      {(['QM', 'SOP', 'WI', 'FM'] as const).map((l) => (
                        <option key={l} value={l}>{levelLabel[l]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="คณะกรรมการ/หน่วยงานผู้จัดทำ">
                    <select value={deptCode} onChange={(e) => setDeptCode(e.target.value)} className={inputCls}>
                      {depts.map((d) => <option key={d.code} value={d.code}>{d.code} — {d.nameTh}</option>)}
                    </select>
                  </Field>
                  <Field label="เอกสารคุณภาพเรื่อง" className="md:col-span-2">
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="เช่น แนวทางการดูแลผู้ป่วยเบาหวาน" required />
                  </Field>
                </>
              ) : (
                <Field label={`เลือกเอกสารที่ต้องการ${kind === 'revise' ? 'แก้ไข' : 'ยกเลิก'}`} className="md:col-span-2">
                  <select value={targetDocId} onChange={(e) => setTargetDocId(e.target.value)} className={inputCls} required>
                    <option value="">— เลือกเอกสารควบคุม —</option>
                    {controlledDocs.map((d) => (
                      <option key={d.id} value={d.id}>{docCode(d)} — {d.title}</option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="เหตุผลการจัดทำหรือแก้ไข" className="md:col-span-2">
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} placeholder="ระบุเหตุผล ความจำเป็น หรือข้อกำหนด/มาตรฐานที่เกี่ยวข้อง" required />
              </Field>
              <Field label="ลงชื่อผู้เสนอ">
                <input value={proposer} onChange={(e) => setProposer(e.target.value)} className={inputCls} required />
              </Field>
              <Field label="ตำแหน่ง">
                <input value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>

          {kind !== 'cancel' && (
            <Card title={<span className="flex items-center gap-2"><Sparkles size={15} className="text-brand-600" /> แนบต้นฉบับ — เติมฟอร์มให้อัตโนมัติ</span>}>
              <label className="grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center hover:border-brand-300 hover:bg-brand-50">
                <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={(e) => onAttach(e.target.files?.[0] ?? null)} />
                {importing ? <Loader2 size={26} className="animate-spin text-brand-500" /> : <FileUp size={26} className="text-slate-400" />}
                <div className="text-sm font-semibold">{file ? file.name : 'แนบไฟล์ต้นฉบับ (DOCX/TXT/PDF)'}</div>
                <div className="text-[11px] text-slate-500">
                  {importing ? 'กำลังอ่านไฟล์และเติมข้อมูล…' : 'แนบ .docx / .txt แล้วระบบจะเติมระดับ หน่วยงาน ชื่อเรื่อง และเหตุผลให้'}
                </div>
              </label>
              {importInfo && (
                <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✓ {importInfo}</div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="รหัสเอกสารที่ระบบจะออกให้">
            <div className="rounded-xl bg-slate-900 px-4 py-5 text-center">
              <div className="font-mono text-xl font-bold tracking-wide text-emerald-400">{previewCode}</div>
              <div className="mt-1 text-[11px] text-slate-400">รูปแบบ AAA-BBB-XXX-YY ตามข้อ 5</div>
            </div>
            <dl className="mt-3 space-y-1 text-xs text-slate-500">
              <div className="flex justify-between"><dt>AAA — รูปแบบเอกสาร</dt><dd className="font-mono font-semibold">{kind === 'new' ? level : targetDoc?.level ?? '—'}</dd></div>
              <div className="flex justify-between"><dt>BBB — หน่วยงาน</dt><dd className="font-mono font-semibold">{kind === 'new' ? deptCode : targetDoc?.deptCode ?? '—'}</dd></div>
              <div className="flex justify-between"><dt>XXX — ลำดับที่</dt><dd className="font-mono font-semibold">{kind === 'new' ? String(nextSeq(level, deptCode)).padStart(3, '0') : targetDoc ? String(targetDoc.seq).padStart(3, '0') : '—'}</dd></div>
              <div className="flex justify-between"><dt>YY — ครั้งที่แก้ไข</dt><dd className="font-mono font-semibold">{kind === 'revise' && targetDoc ? targetDoc.revision + 1 : kind === 'new' ? 1 : targetDoc?.revision ?? '—'}</dd></div>
            </dl>
          </Card>

          <Card title="เส้นทางการอนุมัติ">
            <ol className="space-y-2 text-sm">
              <Step n={1} label="ผู้เสนอยื่นคำขอ" sub={matrix.prepare} />
              <Step n={2} label="ศูนย์คุณภาพตรวจสอบ" sub={`ตรวจความซ้ำซ้อน/รูปแบบ · ${matrix.review}`} />
              <Step n={3} label="ผู้มีอำนาจลงนาม" sub={matrix.approve} />
              <Step n={4} label="ขึ้นทะเบียน + ประทับตรา" sub="เอกสารต้นฉบับเก็บที่ศูนย์คุณภาพ" />
            </ol>
            {kind === 'cancel' && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                <Info size={14} className="mt-0.5 shrink-0" />
                เมื่ออนุมัติ ระบบจะประทับตรา "ยกเลิก" เรียกคืนเอกสารทุกจุด และเก็บต้นฉบับ 1 ปีนับจากวันยกเลิกก่อนทำลาย (ข้อ 6.4)
              </div>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              ส่งคำขอถึงศูนย์คุณภาพ
            </button>
          </Card>

          {kind === 'new' && (
            <Card title="โครงสร้างเนื้อหาที่ต้องมี (ภาคผนวก 7.4)">
              <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
                <li>วัตถุประสงค์</li>
                <li>ขอบเขต</li>
                <li>หน้าที่และความรับผิดชอบ</li>
                <li>คำจำกัดความ</li>
                <li>รายละเอียด/ขั้นตอนการปฏิบัติ</li>
                <li>เอกสารอ้างอิง</li>
                <li>ภาคผนวก</li>
              </ol>
            </Card>
          )}
        </div>
      </form>
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

const Step = ({ n, label, sub }: { n: number; label: string; sub: string }) => (
  <li className="flex gap-3">
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{n}</span>
    <div className="leading-tight">
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  </li>
)
