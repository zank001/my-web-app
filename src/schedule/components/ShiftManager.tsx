import { useState } from 'react'
import { Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { actions, useSchedule } from '../store'
import type { Shift } from '../types'
import { shiftHours } from '../lib/date'
import Modal from './Modal'

const PALETTE = ['#f59e0b', '#2f8fff', '#7c3aed', '#16a34a', '#db2777', '#0891b2', '#dc2626', '#0d9488']

const emptyShift = (): Omit<Shift, 'id' | 'order'> => ({
  name: '', start: '08:00', end: '16:00', color: PALETTE[0], required: 1,
})

export default function ShiftManager() {
  const shifts = useSchedule((s) => s.shifts)
  const [editing, setEditing] = useState<Shift | 'new' | null>(null)
  const ordered = [...shifts].sort((a, b) => a.order - b.order)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800">ประเภทเวร ({shifts.length})</h2>
          <p className="text-xs text-slate-500">ช่วงเวลาของแต่ละเวรและจำนวนคนที่ต้องการต่อวัน</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> เพิ่มประเภทเวร
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((sh) => (
          <div key={sh.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: sh.color }}>
                <Clock size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{sh.name}</div>
                <div className="text-xs text-slate-500">{sh.start}–{sh.end} · {shiftHours(sh.start, sh.end)} ชม.</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing(sh)} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="แก้ไข">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => { if (confirm(`ลบเวร “${sh.name}” และการจัดเวรทั้งหมดของเวรนี้?`)) actions.removeShift(sh.id) }}
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label="ลบ"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 text-[11px]">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">ต้องการ {sh.required} คน/วัน</span>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ShiftForm
          initial={editing === 'new' ? emptyShift() : editing}
          isNew={editing === 'new'}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            if (editing === 'new') actions.addShift(data)
            else actions.updateShift(editing.id, data)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function ShiftForm({
  initial, isNew, onClose, onSave,
}: {
  initial: Omit<Shift, 'id' | 'order'>
  isNew: boolean
  onClose: () => void
  onSave: (data: Omit<Shift, 'id' | 'order'>) => void
}) {
  const [form, setForm] = useState(initial)

  return (
    <Modal open onClose={onClose} title={isNew ? 'เพิ่มประเภทเวร' : 'แก้ไขประเภทเวร'}>
      <div className="space-y-4">
        <Field label="ชื่อเวร">
          <input
            value={form.name} autoFocus
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="เช่น เวรเช้า"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="เวลาเริ่ม">
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </Field>
          <Field label="เวลาสิ้นสุด">
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
          </Field>
        </div>
        <p className="-mt-2 text-[11px] text-slate-400">ระยะเวลา {shiftHours(form.start, form.end)} ชม. (รองรับเวรข้ามเที่ยงคืน)</p>
        <Field label="จำนวนคนที่ต้องการต่อวัน">
          <input
            type="number" min={1} max={20} value={form.required}
            onChange={(e) => setForm({ ...form, required: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Field>
        <Field label="สี">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                className={`h-7 w-7 rounded-full transition ${form.color === c ? 'ring-2 ring-slate-800 ring-offset-2' : ''}`}
                style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </Field>

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
