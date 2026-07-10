import { useState } from 'react'
import Card from './Card'
import {
  defaultModel, getApiKey, getModel, getProvider, providerKeyHint, providerLabel,
  providers, setApiKey, setModel, setProvider, type AiProvider,
} from '../lib/ai'

type Draft = { key: string; model: string }

const initDrafts = (): Record<AiProvider, Draft> =>
  Object.fromEntries(providers.map((p) => [p, { key: getApiKey(p), model: getModel(p) }])) as Record<AiProvider, Draft>

/** แผงตั้งค่าผู้ให้บริการ AI + API key ใช้ร่วมกันทุกหน้าที่เรียก AI */
export default function AiSettings({ onSaved }: { onSaved?: () => void }) {
  const [prov, setProv] = useState<AiProvider>(getProvider())
  // ร่างแยกตามผู้ให้บริการ — สลับเจ้าไปมาแล้วค่าที่พิมพ์ค้างไว้ไม่หาย
  const [drafts, setDrafts] = useState<Record<AiProvider, Draft>>(initDrafts)
  const draft = drafts[prov]
  const setDraft = (patch: Partial<Draft>) =>
    setDrafts((ds) => ({ ...ds, [prov]: { ...ds[prov], ...patch } }))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setProvider(prov)
    setApiKey(prov, draft.key)
    setModel(prov, draft.model)
    onSaved?.()
  }

  return (
    <Card>
      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">ผู้ให้บริการ AI</label>
          <select
            value={prov}
            onChange={(e) => setProv(e.target.value as AiProvider)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            {providers.map((p) => <option key={p} value={p}>{providerLabel[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">โมเดล</label>
          <input
            value={draft.model} onChange={(e) => setDraft({ model: e.target.value })}
            placeholder={defaultModel[prov]}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="md:col-span-2">
          {prov === 'free' ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-56 flex-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                ใช้ได้ทันที ไม่ต้องสมัครหรือใส่ key — เป็นบริการสาธารณะ (Pollinations.ai)
                เหมาะกับงานทั่วไป ช่วงหนาแน่นอาจตอบช้า ถ้าต้องการคุณภาพ/ความเสถียรสูงกว่า แนะนำใส่ key ของเจ้าอื่น
              </p>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">บันทึก</button>
            </div>
          ) : (
            <>
              <label className="mb-1 block text-xs font-semibold text-slate-600">API key ของ {providerLabel[prov]}</label>
              <div className="flex flex-wrap items-end gap-3">
                <input
                  value={draft.key} onChange={(e) => setDraft({ key: e.target.value })} type="password"
                  placeholder={providerKeyHint[prov]}
                  className="min-w-56 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">บันทึก</button>
              </div>
            </>
          )}
        </div>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">
        แบบฟรีใช้ได้ทันทีไม่ต้องมี key · เจ้าอื่นใส่ key ของเจ้านั้น (เก็บในเบราว์เซอร์ของคุณเท่านั้น — localStorage) · โมเดลเว้นว่างได้ (ใช้ค่าเริ่มต้น)
      </p>
    </Card>
  )
}
