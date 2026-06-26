import { FileUp, Sparkles } from 'lucide-react'
import { useState } from 'react'
import Card from '../components/Card'
import { actions, useStore } from '../data/store'
import { docTypeLabel } from '../lib/format'
import type { DocumentType, Priority, QualityDocument } from '../types'

export default function Upload({ onDone }: { onDone: () => void }) {
  const depts = useStore((s) => s.departments)
  const me = useStore((s) => s.users.find((u) => u.id === s.currentUserId))

  const [form, setForm] = useState({
    code: 'QP-RM-',
    title: '',
    type: 'procedure' as DocumentType,
    version: '01',
    effectiveDate: new Date().toISOString().slice(0, 10),
    reviewDate: '',
    priority: 'normal' as Priority,
    ownerDepartmentId: depts[0]?.id ?? '',
    summary: '',
    tags: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [aiBusy, setAiBusy] = useState(false)

  const change = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const doc: QualityDocument = {
      id: `doc-${Date.now().toString(36)}`,
      code: form.code,
      title: form.title,
      type: form.type,
      version: form.version,
      effectiveDate: new Date(form.effectiveDate).toISOString(),
      reviewDate: form.reviewDate ? new Date(form.reviewDate).toISOString() : new Date(Date.now() + 365 * 86400_000).toISOString(),
      status: 'approved',
      priority: form.priority,
      ownerDepartmentId: form.ownerDepartmentId,
      authorId: me?.id ?? 'u-qmr',
      fileName: file?.name ?? `${form.code}_v${form.version}.pdf`,
      fileSize: file?.size ?? 0,
      summary: form.summary,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    actions.addDocument(doc)
    onDone()
  }

  // AI suggestion stub — would call @google/genai with extracted PDF text.
  const aiSuggest = async () => {
    setAiBusy(true)
    await new Promise((r) => setTimeout(r, 700))
    setForm((f) => ({
      ...f,
      summary: f.summary || 'สรุปอัตโนมัติ: เอกสารฉบับนี้กำหนดขั้นตอนปฏิบัติงานเพื่อให้สอดคล้องกับมาตรฐาน HA และนโยบายคุณภาพของโรงพยาบาล',
      tags: f.tags || 'HA, Quality, QMR',
    }))
    setAiBusy(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">อัปโหลด / สร้างเอกสารใหม่</h1>
        <p className="text-sm text-slate-500">เพิ่มเอกสารเข้าระบบควบคุมเพื่อพร้อมจ่ายให้หน่วยงานปลายทาง</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="ข้อมูลเอกสาร">
            <div className="grid grid-cols-2 gap-4">
              <Field label="รหัสเอกสาร">
                <input required value={form.code} onChange={(e) => change('code', e.target.value)} className={inputCls} />
              </Field>
              <Field label="เวอร์ชัน">
                <input required value={form.version} onChange={(e) => change('version', e.target.value)} className={inputCls} />
              </Field>
              <Field label="ชื่อเอกสาร" className="col-span-2">
                <input required value={form.title} onChange={(e) => change('title', e.target.value)} className={inputCls} placeholder="เช่น แนวทางการบริหารความเสี่ยงทางคลินิก" />
              </Field>
              <Field label="ประเภท">
                <select value={form.type} onChange={(e) => change('type', e.target.value as DocumentType)} className={inputCls}>
                  {Object.entries(docTypeLabel).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="ระดับความสำคัญ">
                <select value={form.priority} onChange={(e) => change('priority', e.target.value as Priority)} className={inputCls}>
                  <option value="normal">ปกติ</option>
                  <option value="urgent">ด่วน</option>
                  <option value="critical">ด่วนที่สุด</option>
                </select>
              </Field>
              <Field label="หน่วยงานเจ้าของ">
                <select value={form.ownerDepartmentId} onChange={(e) => change('ownerDepartmentId', e.target.value)} className={inputCls}>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.nameTh} ({d.code})</option>)}
                </select>
              </Field>
              <Field label="วันที่มีผลใช้">
                <input type="date" required value={form.effectiveDate} onChange={(e) => change('effectiveDate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="วันที่ต้องทบทวน">
                <input type="date" value={form.reviewDate} onChange={(e) => change('reviewDate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="แท็ก (คั่นด้วยจุลภาค)" className="col-span-2">
                <input value={form.tags} onChange={(e) => change('tags', e.target.value)} className={inputCls} placeholder="HA, IPC, Triage" />
              </Field>
              <Field
                label="สรุปสาระสำคัญ"
                className="col-span-2"
                action={
                  <button type="button" onClick={aiSuggest} disabled={aiBusy} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline disabled:text-slate-400">
                    <Sparkles size={12} /> {aiBusy ? 'กำลังสรุป…' : 'สรุปด้วย AI'}
                  </button>
                }
              >
                <textarea value={form.summary} onChange={(e) => change('summary', e.target.value)} rows={4} className={inputCls} placeholder="ระบุสาระสำคัญหรือสิ่งที่เปลี่ยนแปลงจากเวอร์ชันก่อน" />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="ไฟล์เอกสาร">
            <label className="grid cursor-pointer place-items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center hover:border-brand-300 hover:bg-brand-50">
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <FileUp size={28} className="text-slate-400" />
              <div className="text-sm font-semibold">{file ? file.name : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}</div>
              <div className="text-[11px] text-slate-500">รองรับ PDF, DOC, DOCX · สูงสุด 25 MB</div>
            </label>
          </Card>

          <Card title="ขั้นตอนถัดไป">
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2"><Dot/>กรอกข้อมูลเอกสารและอัปโหลดไฟล์</li>
              <li className="flex gap-2"><Dot/>บันทึกเอกสารเข้าระบบ (สถานะ "อนุมัติแล้ว")</li>
              <li className="flex gap-2"><Dot/>ไปยังหน้า "การจ่ายเอกสาร" เพื่อเลือกหน่วยงานปลายทาง</li>
              <li className="flex gap-2"><Dot/>ระบบส่งอีเมล + แจ้งเตือนในแอป และติดตามการรับทราบ</li>
            </ol>
            <button type="submit" className="mt-5 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              บันทึก & ไปต่อ
            </button>
          </Card>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100'

const Field = ({ label, children, className = '', action }: { label: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) => (
  <div className={className}>
    <div className="mb-1 flex items-center justify-between">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {action}
    </div>
    {children}
  </div>
)
const Dot = () => <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
