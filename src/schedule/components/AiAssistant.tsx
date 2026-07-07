import { useState } from 'react'
import { KeyRound, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { actions, useSchedule } from '../store'
import { aiGenerateRoster, getGeminiKey, setGeminiKey } from '../lib/ai'
import Modal from './Modal'

export default function AiAssistant({ dates, onClose }: { dates: string[]; onClose: () => void }) {
  const staff = useSchedule((s) => s.staff)
  const shifts = useSchedule((s) => s.shifts)
  const assignments = useSchedule((s) => s.assignments)

  const [apiKey, setApiKey] = useState(getGeminiKey())
  const [instruction, setInstruction] = useState('')
  const [keepExisting, setKeepExisting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const run = async () => {
    setGeminiKey(apiKey)
    if (!apiKey.trim()) { setError('กรุณาใส่ Gemini API key ก่อน'); return }
    setBusy(true); setError(''); setNotes('')
    try {
      const existing = keepExisting
        ? Object.fromEntries(Object.entries(assignments).filter(([k]) => dates.some((d) => k.startsWith(d + '__'))))
        : {}
      const result = await aiGenerateRoster({ dates, shifts, staff, existing, instruction })
      if (Object.keys(result.assignments).length === 0) {
        setError('AI ไม่ได้เสนอการจัดเวร — ลองปรับคำสั่งหรือเพิ่มบุคลากร')
      } else {
        if (!keepExisting) actions.clearDates(dates)
        actions.mergeAssignments(result.assignments)
        setNotes(result.notes || 'จัดเวรด้วย AI เรียบร้อย')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เรียก AI ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-brand-600" /> ผู้ช่วย AI จัดเวร (Gemini)</span>}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <KeyRound size={13} /> Gemini API key
          </div>
          <input
            type="password" value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza… (ขอที่ aistudio.google.com)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-[11px] text-slate-400">เก็บไว้ในเบราว์เซอร์ของคุณเท่านั้น (localStorage) ไม่ได้ส่งไปที่เซิร์ฟเวอร์นี้</p>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-slate-600">คำสั่ง / เงื่อนไขเพิ่มเติม (ไม่บังคับ)</div>
          <textarea
            value={instruction} rows={3}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="เช่น ให้สมหญิงเน้นเวรเช้า, วันเสาร์–อาทิตย์ใช้คนให้น้อยที่สุด, กระจายเวรดึกให้เท่ากัน"
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={keepExisting} onChange={(e) => setKeepExisting(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          คงเวรที่จัดไว้แล้ว แล้วให้ AI เติมส่วนที่ขาด
        </label>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
        {notes && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notes}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">ปิด</button>
          <button
            onClick={run} disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {busy ? 'กำลังจัดเวร…' : 'ให้ AI จัดเวร'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
