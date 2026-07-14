import { deleteApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  doc, getFirestore, onSnapshot, serverTimestamp, setDoc,
  type Firestore, type Unsubscribe,
} from 'firebase/firestore'
import { cloudSync, type SyncKey } from '../data/store'
import { getCloudConfig, setCloudStatus } from './cloudConfig'

/**
 * ชั้นซิงก์ข้อมูลขึ้น Cloud (Firestore) — โหลดแบบ lazy เฉพาะเมื่อผู้ใช้เชื่อมต่อ
 *
 * โครงข้อมูล: collection "qmr-state" มีเอกสารละ 1 หมวด (documents / requests /
 * distributions / activities) เก็บเนื้อหาเป็น JSON string ในฟิลด์ data
 * (เลี่ยงข้อจำกัดค่า undefined/array ซ้อนของ Firestore และเทียบความเปลี่ยนแปลงง่าย)
 *
 * ทุกเครื่องที่เปิดเว็บด้วย config เดียวกันจะเห็นข้อมูลชุดเดียวกันแบบ realtime:
 * เขียนขึ้นเมื่อมีการแก้ไขในเครื่อง (หน่วง 800ms) และรับ onSnapshot จากเครื่องอื่น
 * ใช้รหัสประจำเครื่อง (writer) กันการสะท้อนข้อมูลของตัวเองกลับมาวนซ้ำ
 */

const WRITER = Math.random().toString(36).slice(2, 10)

let app: FirebaseApp | null = null
let db: Firestore | null = null
let unsubs: Unsubscribe[] = []
let pushTimer: ReturnType<typeof setTimeout> | null = null
let firstSyncTimer: ReturnType<typeof setTimeout> | null = null
const lastJson = new Map<SyncKey, string>()

/** snapshot แรกมาถึง = ต่อเซิร์ฟเวอร์ได้จริง — เลิกเตือนว่ากำลังรอ */
const markSynced = () => {
  if (firstSyncTimer) { clearTimeout(firstSyncTimer); firstSyncTimer = null }
  setCloudStatus({ state: 'synced', at: new Date().toISOString() })
}

const mapError = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
    return 'ถูกปฏิเสธสิทธิ์ — ตรวจการตั้งค่า Firestore Rules ให้อนุญาต qmr-state'
  }
  if (msg.includes('not-found') || msg.includes('does not exist')) {
    return 'ไม่พบฐานข้อมูล — เข้า Firebase Console แล้วสร้าง Firestore Database ก่อน'
  }
  return msg.slice(0, 160)
}

async function pushKey(key: SyncKey): Promise<void> {
  if (!db) return
  const json = JSON.stringify(cloudSync.get(key))
  if (json === lastJson.get(key)) return
  lastJson.set(key, json)
  await setDoc(doc(db, 'qmr-state', key), { data: json, writer: WRITER, updatedAt: serverTimestamp() })
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    try {
      for (const key of cloudSync.keys) await pushKey(key)
      setCloudStatus({ state: 'synced', at: new Date().toISOString() })
    } catch (e) {
      setCloudStatus({ state: 'error', detail: mapError(e) })
    }
  }, 800)
}

/** เริ่มซิงก์ (เรียกซ้ำได้ — จะรีเซ็ตการเชื่อมต่อเดิมก่อน) */
export async function startCloud(): Promise<{ ok: boolean; error?: string }> {
  const cfg = getCloudConfig()
  if (!cfg) return { ok: false, error: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ' }

  await stopCloud()
  setCloudStatus({ state: 'connecting' })
  try {
    app = getApps()[0] ?? initializeApp(cfg)
    db = getFirestore(app)

    for (const key of cloudSync.keys) {
      const ref = doc(db, 'qmr-state', key)
      unsubs.push(onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          // ครั้งแรกของโปรเจกต์ — ส่งข้อมูลในเครื่องขึ้นไปตั้งต้น
          pushKey(key).then(markSynced, (e) => setCloudStatus({ state: 'error', detail: mapError(e) }))
          return
        }
        const d = snap.data() as { data?: unknown; writer?: unknown }
        if (typeof d.data !== 'string') return
        if (d.writer === WRITER || lastJson.get(key) === d.data) {
          lastJson.set(key, d.data)
          markSynced()
          return
        }
        lastJson.set(key, d.data)
        try {
          cloudSync.apply(key, JSON.parse(d.data) as unknown[])
          markSynced()
        } catch { /* ข้อมูลเสียรูป — ไม่ทับของในเครื่อง */ }
      }, (err) => setCloudStatus({ state: 'error', detail: mapError(err) })))
    }

    cloudSync.onChange(schedulePush)
    // Firestore จะพยายามต่อซ้ำเงียบๆ เมื่อเครือข่ายมีปัญหา — แจ้งผู้ใช้เมื่อรอนานผิดปกติ
    firstSyncTimer = setTimeout(() => {
      setCloudStatus({
        state: 'connecting',
        detail: 'ยังติดต่อเซิร์ฟเวอร์ไม่สำเร็จ — ระบบจะพยายามต่ออัตโนมัติ (ตรวจอินเทอร์เน็ต, ค่า config และว่าสร้าง Firestore Database แล้ว)',
      })
    }, 15000)
    return { ok: true }
  } catch (e) {
    const error = mapError(e)
    setCloudStatus({ state: 'error', detail: error })
    return { ok: false, error }
  }
}

/** หยุดซิงก์และคืนสถานะเป็นปิด (ข้อมูลในเครื่องยังอยู่ครบ) */
export async function stopCloud(): Promise<void> {
  unsubs.forEach((u) => u())
  unsubs = []
  cloudSync.onChange(null)
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }
  if (firstSyncTimer) { clearTimeout(firstSyncTimer); firstSyncTimer = null }
  lastJson.clear()
  if (app) {
    try { await deleteApp(app) } catch { /* ignore */ }
    app = null
    db = null
  }
  setCloudStatus({ state: 'off' })
}
