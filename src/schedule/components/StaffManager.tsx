import { useRef, useState } from 'react'
import { Pencil, Plus, Trash2, Upload, UserRound } from 'lucide-react'
import { actions, useSchedule } from '../store'
import type { Staff } from '../types'
import { weekdayShortTh } from '../lib/date'
import { importStaffXlsx } from '../lib/excel'
import Modal from './Modal'

const PALETTE = ['#2f8fff', '#16a34a', '#f59e0b', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#0d9488', '#9333ea', '#ea580c']

const emptyStaff = (): Omit<Staff, 'id'> => ({
  name: '', role: 'พยาบาลวิชาชีพ', color: PALETTE[0], maxPerWeek: 5, unavailableWeekdays: [], active: true,
})

export default function StaffManager() {
  const staff = useSchedule((s) => s.staff)
  const [editing, setEditing] = useState<Staff | 'new' | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onImport = async (file: File) => {
    try {
      const rows = await importStaffXlsx(file)
      if (!rows.length) { setImportMsg('ไม่พบรายชื่อในไฟล์ (ต้องมีคอลัมน์ “ชื่อ”)'); return }
      rows.forEach((r) => actions.addStaff(r))
      setImportMsg(`นำเข้าแล้ว ${rows.length} รายชื่อ`)
    } catch {
      setImportMsg('อ่านไฟล์ไม่สำเร็จ — รองรับ .xlsx / .csv')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">บุคลากร ({staff.length} คน)</h2>
          <p className="text-xs text-slate-500">ผู้ที่จะถูกจัดเข้าเวร — ปิดใช้งานได้โดยไม่ต้องลบ</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload size={16} /> นำเข้า Excel
          </button>
          <button
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Plus size={16} /> เพิ่มบุคลากร
          </button>
        </div>
      </div>

      {importMsg && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">{importMsg}</p>}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-3 ${p.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'}`}
          >
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" style={{ background: p.color }}>
                <UserRound size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{p.name}</div>
                <div className="truncate text-xs text-slate-500">{p.role}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing(p)} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="แก้ไข">
                  <Pencil size={14} />
                </button>
                <button onClick={() => { if (confirm(`ลบ ${p.name}?`)) actions.removeStaff(p.id) }} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="ลบ">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">สูงสุด {p.maxPerWeek} เวร/สัปดาห์</span>
              {!p.active && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">ปิดใช้งาน</span>}
              {p.unavailableWeekdays.length > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
                  ลา: {p.unavailableWeekdays.map((d) => weekdayShortTh[d]).join(' ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <StaffForm
          initial={editing === 'new' ? emptyStaff() : editing}
          isNew={editing === 'new'}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') actions.addStaff(data)
            else actions.updateStaff(editing.id, data)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function StaffForm({
  initial, isNew, onClose, onSave,
}: {
  initial: Omit<Staff, 'id'>
  isNew: boolean
  onClose: () => void
  onSave: (data: Omit<Staff, 'id'>) => void
}) {
  const [form, setForm] = useState<Omit<Staff, 'id'>>(initial)
  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      unavailableWeekdays: f.unavailableWeekdays.includes(d)
        ? f.unavailableWeekdays.filter((x) => x !== d)
        : [...f.unavailableWeekdays, d].sort(),
    }))

  return (
    <Modal open onClose={onClose} title={isNew ? 'เพิ่มบุคลากร' : 'แก้ไขบุคลากร'}>
      <div className="space-y-4">
        <Field label="ชื่อ–สกุล">
          <input
            value={form.name} autoFocus
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="เช่น สมหญิง ใจดี"
          />
        </Field>
        <Field label="ตำแหน่ง">
          <input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="เวรสูงสุด/สัปดาห์">
            <input
              type="number" min={1} max={14} value={form.maxPerWeek}
              onChange={(e) => setForm({ ...form, maxPerWeek: Math.max(1, Math.min(14, Number(e.target.value) || 1)) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </Field>
          <Field label="สีประจำตัว">
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full transition ${form.color === c ? 'ring-2 ring-slate-800 ring-offset-2' : ''}`}
                  style={{ background: c }} aria-label={c}
                />
              ))}
            </div>
          </Field>
        </div>
        <Field label="วันที่ลา / ไม่สะดวก">
          <div className="flex flex-wrap gap-1.5">
            {weekdayShortTh.map((w, d) => (
              <button
                key={d} type="button" onClick={() => toggleDay(d)}
                className={`h-9 w-9 rounded-lg border text-xs font-medium transition ${
                  form.unavailableWeekdays.includes(d)
                    ? 'border-rose-300 bg-rose-100 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-brand-600" />
          พร้อมทำงาน (จัดเข้าเวรได้)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">ยกเลิก</button>
          <button
            onClick={() => form.name.trim() && onSave({ ...form, name: form.name.trim() })}
            disabled={!form.name.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            บันทึก
          </button>
        </div>
      </div>
    </Modal>
  )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-1 text-xs font-medium text-slate-600">{label}</div>
    {children}
  </div>
)
