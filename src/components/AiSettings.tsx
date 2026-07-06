import { useState } from 'react'
import Card from './Card'
import {
  defaultModel, getApiKey, getModel, getProvider, providerKeyHint, providerLabel,
  providers, setApiKey, setModel, setProvider, type AiProvider,
} from '../lib/ai'

/** แผงตั้งค่าผู้ให้บริการ AI + API key ใช้ร่วมกันทุกหน้าที่เรียก AI */
export default function AiSettings({ onSaved }: { onSaved?: () => void }) {
  const [prov, setProv] = useState<AiProvider>(getProvider())
  const [keyInput, setKeyInput] = useState(getApiKey())
  const [modelInput, setModelInput] = useState(getModel())

  // สลับผู้ให้บริการ → โหลด key/โมเดลของเจ้านั้นมาแสดง
  const pickProvider = (p: AiProvider) => {
    setProv(p)
    setKeyInput(getApiKey(p))
    setModelInput(getModel(p))
  }
  const save = () => {
    setProvider(prov)
    setApiKey(prov, keyInput)
    setModel(prov, modelInput)
    onSaved?.()
  }

  return (
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
            <button onClick={save} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">บันทึก</button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        เลือกเจ้า AI แล้วใส่ key ของเจ้านั้น · key เก็บแยกกันในเบราว์เซอร์ของคุณเท่านั้น (localStorage) · โมเดลเว้นว่างได้ (ใช้ค่าเริ่มต้น) · เว็บสาธิตจึงเรียก AI ฝั่งผู้ใช้
      </p>
    </Card>
  )
}
