import { useSyncExternalStore } from 'react'

/**
 * การตั้งค่าเชื่อมต่อ Cloud (Firebase/Firestore) + สถานะการซิงก์
 *
 * แยกจาก src/lib/cloud.ts เพื่อให้หน้า UI อ่านสถานะ/ตั้งค่าได้โดยไม่ต้องโหลด
 * Firebase SDK (ตัว SDK โหลดแบบ lazy เฉพาะเมื่อเชื่อมต่อจริง)
 *
 * ที่มาของ config (เรียงลำดับ): ตัวแปร env ตอน build (VITE_FIREBASE_*)
 * → ค่าที่ผู้ใช้วางไว้ในหน้าตั้งค่า (เก็บใน localStorage ของเครื่องนั้น)
 * หมายเหตุ: Firebase web config ไม่ใช่ความลับ — การคุมสิทธิ์ทำที่ Firestore Rules
 */

export interface CloudConfig {
  apiKey: string
  authDomain?: string
  projectId: string
  storageBucket?: string
  messagingSenderId?: string
  appId?: string
  measurementId?: string
}

/**
 * โปรเจกต์ Firebase ของโรงพยาบาลปาย (ฝังมากับระบบ — เชื่อมต่ออัตโนมัติทุกครั้ง)
 *
 * Firebase web config ไม่ใช่ความลับ (Google ออกแบบให้ฝังในเว็บฝั่งผู้ใช้ได้) —
 * การคุมสิทธิ์เข้าถึงข้อมูลทำที่ Firestore Rules ไม่ใช่ที่ค่า config นี้
 */
const BUILTIN_CONFIG: CloudConfig = {
  apiKey: 'AIzaSyDo7q3UyktQQFCnkf9CgBwVJmsWt4hfDr0',
  authDomain: 'qmr-pai.firebaseapp.com',
  projectId: 'qmr-pai',
  storageBucket: 'qmr-pai.firebasestorage.app',
  messagingSenderId: '715127714873',
  appId: '1:715127714873:web:c7a5bf191608e5f52449e8',
  measurementId: 'G-VYBLCSXJK6',
}

const CFG_KEY = 'qmr_cloud_config'

const envConfig = (): CloudConfig | null => {
  const env = import.meta.env
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }
  }
  return null
}

const customConfig = (): CloudConfig | null => {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as CloudConfig
    return c.apiKey && c.projectId ? c : null
  } catch {
    return null
  }
}

/** ลำดับความสำคัญ: env (ตอน build) → ที่ผู้ใช้ตั้งเอง → ค่าที่ฝังมากับระบบ */
export function getCloudConfig(): CloudConfig | null {
  return envConfig() ?? customConfig() ?? BUILTIN_CONFIG
}

/** ที่มาของ config ที่ใช้อยู่ */
export const cloudConfigSource = (): 'env' | 'custom' | 'builtin' =>
  envConfig() ? 'env' : customConfig() ? 'custom' : 'builtin'

export const hasCloudConfig = () => getCloudConfig() !== null
export const cloudConfigFromEnv = () => Boolean(envConfig())

/**
 * รับข้อความที่วางจากหน้า Firebase Console ได้ตรงๆ — ทั้ง JSON แท้ และ snippet
 * แบบ `const firebaseConfig = { apiKey: "...", ... };` (คีย์ไม่มีเครื่องหมายคำพูด)
 */
export function saveCloudConfig(text: string): { ok: boolean; error?: string } {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return { ok: false, error: 'ไม่พบข้อมูล config — วางทั้งก้อน { … } จาก Firebase Console' }
  let body = text.slice(start, end + 1)
  // แปลง snippet JS → JSON: ครอบคีย์ด้วยเครื่องหมายคำพูด, เปลี่ยน ' → ", ตัด , ท้ายรายการ
  body = body
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"')
    .replace(/,\s*([}\]])/g, '$1')
  try {
    const cfg = JSON.parse(body) as CloudConfig
    if (!cfg.apiKey || !cfg.projectId) return { ok: false, error: 'config ต้องมีอย่างน้อย apiKey และ projectId' }
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
    return { ok: true }
  } catch {
    return { ok: false, error: 'อ่าน config ไม่ได้ — ตรวจว่าคัดลอกครบทั้งก้อน { … }' }
  }
}

export function clearCloudConfig() {
  try { localStorage.removeItem(CFG_KEY) } catch { /* ignore */ }
}

/* --------------------------------- สถานะการซิงก์ --------------------------------- */

export interface CloudStatus {
  state: 'off' | 'connecting' | 'synced' | 'error'
  detail?: string
  at?: string // เวลาซิงก์ล่าสุด (ISO)
}

let status: CloudStatus = { state: 'off' }
const listeners = new Set<() => void>()

export const setCloudStatus = (s: CloudStatus) => {
  status = s
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export const useCloudStatus = (): CloudStatus =>
  useSyncExternalStore(subscribe, () => status)
