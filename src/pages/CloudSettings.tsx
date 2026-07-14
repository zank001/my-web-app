import { Cloud, CloudOff, Loader2, Plug, ShieldAlert, Unplug } from 'lucide-react'
import { useState } from 'react'
import Card from '../components/Card'
import {
  clearCloudConfig, cloudConfigFromEnv, getCloudConfig, hasCloudConfig,
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
  const [text, setText] = useState(() => {
    const c = getCloudConfig()
    return c && !cloudConfigFromEnv() ? JSON.stringify(c, null, 2) : ''
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const connect = async () => {
    setMsg(null)
    if (!cloudConfigFromEnv()) {
      const saved = saveCloudConfig(text)
      if (!saved.ok) { setMsg({ ok: false, text: saved.error ?? 'บันทึกไม่สำเร็จ' }); return }
    }
    setBusy(true)
    try {
      const { startCloud } = await import('../lib/cloud')
      const r = await startCloud()
      setMsg(r.ok
        ? { ok: true, text: 'เชื่อมต่อแล้ว — ข้อมูลจะซิงก์ขึ้น Cloud อัตโนมัติทุกครั้งที่มีการแก้ไข' }
        : { ok: false, text: r.error ?? 'เชื่อมต่อไม่สำเร็จ' })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'เชื่อมต่อไม่สำเร็จ' })
    } finally { setBusy(false) }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      const { stopCloud } = await import('../lib/cloud')
      await stopCloud()
      clearCloudConfig()
      setText('')
      setMsg({ ok: true, text: 'ยกเลิกการเชื่อมต่อแล้ว — ข้อมูลยังถูกบันทึกในเครื่องนี้ตามปกติ' })
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
          เชื่อมต่อ Firebase (Firestore) เพื่อให้ข้อมูลเอกสาร คำขอ และการแจกจ่าย
          ถูกเก็บถาวรบน Cloud และใช้ร่วมกันได้ทุกเครื่องแบบ realtime
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
            แม้ไม่เชื่อมต่อ ข้อมูลก็ถูกบันทึกในเครื่องนี้ (localStorage) ไม่หายเมื่อรีเฟรช
          </span>
        </div>
        {status.detail && (
          <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${status.state === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
            {status.detail}
          </p>
        )}
      </Card>

      <Card title="การเชื่อมต่อ Firebase">
        {cloudConfigFromEnv() ? (
          <p className="text-sm text-slate-600">
            ระบบตั้งค่าผ่านตัวแปรตอน build (VITE_FIREBASE_*) แล้ว — กด "เชื่อมต่อ" เพื่อเริ่มซิงก์
          </p>
        ) : (
          <>
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>เข้า <span className="font-mono text-xs">console.firebase.google.com</span> → สร้างโปรเจกต์ (ฟรี)</li>
              <li>เมนู Build → <b>Firestore Database</b> → Create database</li>
              <li>แท็บ Rules วางกฎด้านล่างนี้แล้ว Publish</li>
              <li>Project settings → Your apps → เพิ่ม Web app → คัดลอกก้อน <span className="font-mono text-xs">firebaseConfig</span> มาวางที่นี่</li>
            </ol>
            <pre className="mb-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">{RULES_SNIPPET}</pre>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={7}
              placeholder={'วาง firebaseConfig ที่นี่ เช่น\nconst firebaseConfig = {\n  apiKey: "AIza…",\n  projectId: "pai-qmr",\n  …\n};'}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={connect} disabled={busy || (!cloudConfigFromEnv() && !text.trim())}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plug size={15} />} บันทึก & เชื่อมต่อ
          </button>
          {hasCloudConfig() && !cloudConfigFromEnv() && (
            <button
              onClick={disconnect} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Unplug size={15} /> ยกเลิกการเชื่อมต่อ
            </button>
          )}
        </div>
        {msg && (
          <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {msg.text}
          </p>
        )}
      </Card>

      <Card>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <span>
            ข้อมูลที่ซิงก์: บัญชีเอกสาร · คำขอขึ้นทะเบียน/แก้ไข · การแจกจ่าย/ลงนามรับ · ประวัติกิจกรรม
            (config ของ Firebase ไม่ใช่ความลับ แต่<b>สิทธิ์การเข้าถึงข้อมูลคุมที่ Firestore Rules</b> —
            กฎตัวอย่างด้านบนเปิดให้ทุกคนที่มี config อ่าน/เขียนได้ เหมาะกับใช้ภายในทีม
            หากใช้จริงทั้งโรงพยาบาลควรเปิด Firebase Authentication แล้วจำกัดสิทธิ์ใน Rules เพิ่มเติม)
          </span>
        </p>
      </Card>
    </div>
  )
}
