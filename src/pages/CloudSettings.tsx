import { Cloud, CloudOff, Loader2, Plug, RotateCw, Settings2, ShieldAlert, Unplug } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import {
  clearCloudConfig, cloudConfigFromEnv, cloudConfigSource, getCloudConfig,
  saveCloudConfig, useCloudStatus,
} from '../lib/cloudConfig'

const RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /qmr-state/{docId} {
      allow read, write: if true; // ใช้ภายใน — ควรจำกัดสิทธิ์เพิ่มเมื่อใช้จริง
    }
  }
}`

export default function CloudSettings() {
  const status = useCloudStatus()
  const source = cloudConfigSource()
  const projectId = getCloudConfig()?.projectId ?? '—'
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // เชื่อมต่ออัตโนมัติเมื่อเปิดหน้านี้ ถ้ายังไม่ได้เชื่อม (config ฝังมากับระบบแล้ว)
  useEffect(() => {
    if (status.state === 'off') import('../lib/cloud').then((m) => m.startCloud())
    // ครั้งเดียวตอนเข้าหน้า
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reconnect = async () => {
    setBusy(true); setMsg(null)
    try {
      const { startCloud } = await import('../lib/cloud')
      const r = await startCloud()
      setMsg(r.ok ? { ok: true, text: 'เริ่มเชื่อมต่อใหม่แล้ว' } : { ok: false, text: r.error ?? 'เชื่อมต่อไม่สำเร็จ' })
    } finally { setBusy(false) }
  }

  const useCustom = async () => {
    setMsg(null)
    const saved = saveCloudConfig(text)
    if (!saved.ok) { setMsg({ ok: false, text: saved.error ?? 'บันทึกไม่สำเร็จ' }); return }
    setBusy(true)
    try {
      const { startCloud } = await import('../lib/cloud')
      const r = await startCloud()
      setMsg(r.ok
        ? { ok: true, text: 'เปลี่ยนไปใช้โปรเจกต์ที่กำหนดแล้ว' }
        : { ok: false, text: r.error ?? 'เชื่อมต่อไม่สำเร็จ' })
    } finally { setBusy(false) }
  }

  const revertDefault = async () => {
    setBusy(true); setMsg(null)
    try {
      clearCloudConfig()
      setText('')
      const { startCloud } = await import('../lib/cloud')
      await startCloud()
      setMsg({ ok: true, text: 'กลับไปใช้โปรเจกต์เริ่มต้นของระบบแล้ว' })
    } finally { setBusy(false) }
  }

  const pill = {
    off: { cls: 'bg-slate-100 text-slate-600', icon: CloudOff, label: 'ยังไม่เชื่อมต่อ' },
    connecting: { cls: 'bg-amber-50 text-amber-700', icon: Loader2, label: 'กำลังเชื่อมต่อ…' },
    synced: { cls: 'bg-emerald-50 text-emerald-700', icon: Cloud, label: 'ซิงก์แล้ว' },
    error: { cls: 'bg-rose-50 text-rose-700', icon: ShieldAlert, label: 'ผิดพลาด' },
  }[status.state]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">บันทึกข้อมูลลง Cloud</h1>
        <p className="text-sm text-slate-500">
          ข้อมูลเอกสาร คำขอ และการแจกจ่าย ถูกเก็บถาวรบน Cloud และใช้ร่วมกันได้ทุกเครื่องแบบ realtime
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${pill.cls}`}>
            <pill.icon size={15} className={status.state === 'connecting' ? 'animate-spin' : ''} />
            {pill.label}
            {status.state === 'synced' && status.at && (
              <span className="font-normal">· ล่าสุด {new Date(status.at).toLocaleTimeString('th-TH')}</span>
            )}
          </span>
          <span className="text-[11px] text-slate-400">
            ข้อมูลถูกบันทึกในเครื่องนี้ (localStorage) เสมอ ไม่หายเมื่อรีเฟรช
          </span>
        </div>
        {status.detail && (
          <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${status.state === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
            {status.detail}
          </p>
        )}
      </Card>

      <Card title="การเชื่อมต่อ Firebase">
        <div className="rounded-lg bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Cloud size={16} /> เชื่อมต่ออัตโนมัติแล้ว
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            ระบบตั้งค่าเชื่อมต่อโปรเจกต์ <span className="font-mono font-semibold">{projectId}</span>{' '}
            {source === 'env' ? '(จากตัวแปรตอน build)' : source === 'custom' ? '(ที่คุณกำหนดเอง)' : 'ให้ในตัวแล้ว'}{' '}
            — เปิดเว็บครั้งไหนก็เชื่อมต่อและซิงก์ให้เอง ไม่ต้องกรอกใหม่
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={reconnect} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <RotateCw size={15} />} เชื่อมต่อใหม่
          </button>
          {source === 'custom' && (
            <button
              onClick={revertDefault} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Unplug size={15} /> กลับไปใช้โปรเจกต์เริ่มต้น
            </button>
          )}
          {source !== 'env' && (
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              <Settings2 size={14} /> ใช้โปรเจกต์ Firebase อื่น (ขั้นสูง)
            </button>
          )}
        </div>

        {showAdvanced && source !== 'env' && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>เข้า <span className="font-mono text-xs">console.firebase.google.com</span> → สร้างโปรเจกต์ (ฟรี)</li>
              <li>เมนู Build → <b>Firestore Database</b> → Create database</li>
              <li>แท็บ Rules วางกฎด้านล่างนี้แล้ว Publish</li>
              <li>Project settings → Your apps → เพิ่ม Web app → คัดลอกก้อน <span className="font-mono text-xs">firebaseConfig</span> มาวาง</li>
            </ol>
            <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">{RULES_SNIPPET}</pre>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={7}
              placeholder={'วาง firebaseConfig ของโปรเจกต์อื่นที่นี่'}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={useCustom} disabled={busy || !text.trim()}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />} ใช้โปรเจกต์นี้แทน
            </button>
          </div>
        )}

        {cloudConfigFromEnv() && (
          <p className="mt-3 text-xs text-slate-500">ระบบตั้งค่าผ่านตัวแปรตอน build (VITE_FIREBASE_*) — ใช้ค่านี้เป็นหลัก</p>
        )}
        {msg && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {msg.text}
          </p>
        )}
      </Card>

      <Card>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            ข้อมูลที่ซิงก์: บัญชีเอกสาร · คำขอขึ้นทะเบียน/แก้ไข · การแจกจ่าย/ลงนามรับ · ประวัติกิจกรรม ·
            <b> สิทธิ์การเข้าถึงข้อมูลคุมที่ Firestore Rules</b> ไม่ใช่ที่ค่า config (config ของ Firebase
            ฝังในเว็บได้ตามปกติ) หากใช้กับข้อมูลจริงทั้งโรงพยาบาล แนะนำเปิด Firebase Authentication
            แล้วจำกัดสิทธิ์ใน Rules ให้เข้มขึ้น (กฎตัวอย่างด้านบนเปิดให้ทุกคนที่เข้าถึงเว็บอ่าน/เขียนได้)
          </span>
        </p>
      </Card>
    </div>
  )
}
