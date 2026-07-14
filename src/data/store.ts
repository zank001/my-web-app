import { useSyncExternalStore } from 'react'
import type {
  Activity, Department, Distribution, DocRequest, QualityDocument, User,
} from '../types'
import { docCode } from '../lib/format'
import {
  activities as seedActivities,
  departments as seedDepartments,
  distributions as seedDistributions,
  documents as seedDocuments,
  requests as seedRequests,
  users as seedUsers,
} from './seed'

interface State {
  currentUserId: string | null
  users: User[]
  departments: Department[]
  documents: QualityDocument[]
  requests: DocRequest[]
  distributions: Distribution[]
  activities: Activity[]
}

const SESSION_KEY = 'qmr_session'
const readSession = (): string | null => {
  try {
    const id = localStorage.getItem(SESSION_KEY)
    return id && seedUsers.some((u) => u.id === id) ? id : null
  } catch {
    return null
  }
}

/* ---------------- บันทึกข้อมูลถาวร (localStorage + ชั้นซิงก์ Cloud) ---------------- */

/** ส่วนของ state ที่เป็นข้อมูลใช้งานจริง (เปลี่ยนแปลงได้) — บันทึกถาวร/ซิงก์ขึ้น Cloud */
export type SyncKey = 'documents' | 'requests' | 'distributions' | 'activities'
const SYNC_KEYS: SyncKey[] = ['documents', 'requests', 'distributions', 'activities']

const DATA_KEY = 'qmr_data_v1'
const readSaved = (): Partial<Pick<State, SyncKey>> => {
  try {
    const raw = localStorage.getItem(DATA_KEY)
    return raw ? (JSON.parse(raw) as Partial<Pick<State, SyncKey>>) : {}
  } catch {
    return {}
  }
}

let state: State = {
  currentUserId: readSession(),
  users: seedUsers,
  departments: seedDepartments,
  documents: seedDocuments,
  requests: seedRequests,
  distributions: seedDistributions,
  activities: seedActivities,
  // ข้อมูลที่บันทึกไว้ในเครื่องทับข้อมูลตัวอย่าง (ถ้ามี)
  ...readSaved(),
}

// OTP ที่ออกให้ระหว่างล็อกอิน (เดโม — เก็บชั่วคราวในหน่วยความจำ ไม่ใช่ใน state)
let otpChallenge: { email: string; code: string; userId: string } | null = null

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// selector ต้องคืนค่า reference เดิมเมื่อ state ไม่เปลี่ยน — ห้าม .map/.filter ในนี้
export const useStore = <T,>(selector: (s: State) => T): T =>
  useSyncExternalStore(subscribe, () => selector(state))

// บันทึกลงเครื่องแบบหน่วงเวลา (กันเขียนถี่เกินไป) และแจ้งชั้นซิงก์ Cloud
let persistTimer: ReturnType<typeof setTimeout> | null = null
const persist = () => {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      const data = Object.fromEntries(SYNC_KEYS.map((k) => [k, state[k]]))
      localStorage.setItem(DATA_KEY, JSON.stringify(data))
    } catch { /* พื้นที่เต็ม/โหมดส่วนตัว — ข้าม */ }
  }, 400)
}

let applyingRemote = false
let cloudOnChange: (() => void) | null = null

const update = (mut: (s: State) => State) => {
  state = mut(state)
  emit()
  persist()
  if (!applyingRemote) cloudOnChange?.()
}

/** ช่องเชื่อมสำหรับชั้นซิงก์ Cloud (src/lib/cloud.ts) — ไม่ใช้จากหน้า UI โดยตรง */
export const cloudSync = {
  keys: SYNC_KEYS,
  get: (k: SyncKey) => state[k] as unknown[],
  /** รับข้อมูลจาก Cloud มาแทนที่ (ไม่สะท้อนกลับขึ้น Cloud ซ้ำ) */
  apply(k: SyncKey, items: unknown[]) {
    applyingRemote = true
    try { update((s) => ({ ...s, [k]: items })) } finally { applyingRemote = false }
  },
  onChange(fn: (() => void) | null) { cloudOnChange = fn },
}

const now = () => new Date().toISOString()
const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const log = (action: string, target: string) => {
  const user = state.users.find((u) => u.id === state.currentUserId)
  update((s) => ({
    ...s,
    activities: [
      { id: uid('a'), at: now(), actorName: user?.name ?? 'ระบบ', action, target },
      ...s.activities,
    ].slice(0, 80),
  }))
}

/** ลำดับที่ถัดไปของเอกสาร ระดับ+หน่วยงานเดียวกัน (XXX ใน AAA-BBB-XXX-YY) */
export const nextSeq = (level: QualityDocument['level'], deptCode: string) =>
  state.documents
    .filter((d) => d.level === level && d.deptCode === deptCode)
    .reduce((max, d) => Math.max(max, d.seq), 0) + 1

export const actions = {
  /**
   * ขั้นที่ 1 ของล็อกอิน: ขอรหัส OTP ทางอีเมล
   * โหมดสาธิต — ไม่ได้ส่งอีเมลจริง แต่คืนรหัสกลับมาเพื่อแสดงบนจอ
   * (จุดนี้สลับเป็น Firebase Auth email link/OTP ได้ในภายหลัง)
   */
  requestOtp(email: string): { ok: boolean; code?: string; error?: string } {
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) return { ok: false, error: 'ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง' }
    const code = String(Math.floor(100000 + Math.random() * 900000))
    otpChallenge = { email: user.email.toLowerCase(), code, userId: user.id }
    return { ok: true, code }
  },

  /** ขั้นที่ 2 ของล็อกอิน: ยืนยันรหัส OTP */
  verifyOtp(email: string, code: string): { ok: boolean; error?: string } {
    if (!otpChallenge || otpChallenge.email !== email.trim().toLowerCase()) {
      return { ok: false, error: 'กรุณาขอรหัสใหม่อีกครั้ง' }
    }
    if (otpChallenge.code !== code.trim()) {
      return { ok: false, error: 'รหัส OTP ไม่ถูกต้อง' }
    }
    const userId = otpChallenge.userId
    otpChallenge = null
    try { localStorage.setItem(SESSION_KEY, userId) } catch { /* ignore */ }
    update((s) => ({ ...s, currentUserId: userId }))
    const user = state.users.find((u) => u.id === userId)
    log('เข้าสู่ระบบ', user?.name ?? '')
    return { ok: true }
  },

  logout() {
    otpChallenge = null
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    update((s) => ({ ...s, currentUserId: null }))
  },

  /** ยื่นใบขอขึ้นทะเบียน/แก้ไข/ยกเลิก (FM-QMR-001-01) */
  submitRequest(req: Omit<DocRequest, 'id' | 'submittedAt' | 'status'>) {
    const full: DocRequest = { ...req, id: uid('req'), submittedAt: now(), status: 'submitted' }
    update((s) => ({ ...s, requests: [full, ...s.requests] }))
    log('ยื่นคำขอ' + (req.kind === 'new' ? 'ขึ้นทะเบียนใหม่' : req.kind === 'revise' ? 'แก้ไขเอกสาร' : 'ยกเลิกเอกสาร'), req.title)
    return full.id
  },

  /** ศูนย์คุณภาพตรวจสอบคำขอ (ข้อ 6.1): ผ่าน → รออนุมัติ / ไม่ผ่าน → ส่งกลับแก้ไข */
  qcReview(requestId: string, pass: boolean, comment: string) {
    const user = state.users.find((u) => u.id === state.currentUserId)
    update((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === requestId
          ? { ...r, status: pass ? 'reviewed' : 'needs_fix', qcComment: comment, qcBy: user?.name }
          : r,
      ),
    }))
    const req = state.requests.find((r) => r.id === requestId)
    log(pass ? 'ตรวจสอบคำขอผ่าน' : 'ส่งคำขอกลับแก้ไข', req?.title ?? requestId)
  },

  /**
   * ผู้มีอำนาจอนุมัติคำขอ (ข้อ 6.2/6.4)
   * new → ออกเอกสารควบคุมฉบับใหม่ พร้อมรหัสอัตโนมัติ
   * revise → แก้ไขครั้งที่ +1 และบันทึกประวัติ
   * cancel → ประทับตรายกเลิก เก็บ 1 ปีก่อนทำลาย
   */
  approveRequest(requestId: string, approverName: string) {
    const req = state.requests.find((r) => r.id === requestId)
    if (!req || (req.status !== 'reviewed' && req.status !== 'submitted')) return

    if (req.kind === 'new') {
      const seq = nextSeq(req.level, req.deptCode)
      const doc: QualityDocument = {
        id: uid('doc'),
        level: req.level, deptCode: req.deptCode, seq, revision: 1,
        title: req.title, status: 'controlled', effectiveDate: now(),
        preparedBy: req.proposer, reviewedBy: req.qcBy ?? 'ศูนย์คุณภาพ', approvedBy: approverName,
        fileName: `${req.level}-${req.deptCode}-${String(seq).padStart(3, '0')}-1.pdf`,
        summary: req.reason,
        revisionLog: [{ date: now(), revision: 1, note: 'อนุมัติใช้เอกสาร' }],
      }
      update((s) => ({ ...s, documents: [doc, ...s.documents] }))
      log('อนุมัติขึ้นทะเบียนเอกสาร', docCode(doc) + ' ' + doc.title)
    } else if (req.kind === 'revise' && req.targetDocId) {
      update((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === req.targetDocId
            ? {
                ...d,
                revision: d.revision + 1,
                status: 'controlled',
                effectiveDate: now(),
                fileName: `${d.level}-${d.deptCode}-${String(d.seq).padStart(3, '0')}-${d.revision + 1}.pdf`,
                revisionLog: [...d.revisionLog, { date: now(), revision: d.revision + 1, note: req.reason }],
              }
            : d,
        ),
      }))
      const doc = state.documents.find((d) => d.id === req.targetDocId)
      log('อนุมัติแก้ไขเอกสาร', doc ? docCode(doc) + ' ' + doc.title : req.title)
    } else if (req.kind === 'cancel' && req.targetDocId) {
      const destroy = new Date()
      destroy.setFullYear(destroy.getFullYear() + 1)
      update((s) => ({
        ...s,
        documents: s.documents.map((d) =>
          d.id === req.targetDocId
            ? {
                ...d,
                status: 'cancelled',
                cancelledAt: now(),
                destroyAfter: destroy.toISOString(),
                revisionLog: [...d.revisionLog, { date: now(), revision: d.revision, note: 'ยกเลิกเอกสาร — ' + req.reason }],
              }
            : d,
        ),
      }))
      log('ประทับตรายกเลิกเอกสาร', req.title + ' (เก็บ 1 ปีก่อนทำลาย)')
    }

    update((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === requestId ? { ...r, status: 'approved', decidedAt: now(), decidedBy: approverName } : r,
      ),
    }))
  },

  rejectRequest(requestId: string, approverName: string, reason: string) {
    update((s) => ({
      ...s,
      requests: s.requests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'rejected', decidedAt: now(), decidedBy: approverName, qcComment: reason }
          : r,
      ),
    }))
    const req = state.requests.find((r) => r.id === requestId)
    log('ไม่อนุมัติคำขอ', req?.title ?? requestId)
  },

  /** QMR แจกจ่ายเอกสารควบคุม */
  createDistribution(dist: Omit<Distribution, 'id' | 'sentAt'>) {
    const full: Distribution = { ...dist, id: uid('dist'), sentAt: now() }
    update((s) => ({ ...s, distributions: [full, ...s.distributions] }))
    const doc = state.documents.find((d) => d.id === dist.documentId)
    log('แจกจ่ายเอกสาร', `${doc ? docCode(doc) : ''} → ${dist.recipients.length} หน่วยงาน`)
    return full.id
  },

  markOpened(distId: string, deptCode: string) {
    update((s) => ({
      ...s,
      distributions: s.distributions.map((d) =>
        d.id !== distId
          ? d
          : {
              ...d,
              recipients: d.recipients.map((r) =>
                r.deptCode === deptCode && r.status === 'pending'
                  ? { ...r, status: 'opened', openedAt: now() }
                  : r,
              ),
            },
      ),
    }))
  },

  acknowledge(distId: string, deptCode: string, signature: string, note?: string) {
    update((s) => ({
      ...s,
      distributions: s.distributions.map((d) =>
        d.id !== distId
          ? d
          : {
              ...d,
              recipients: d.recipients.map((r) =>
                r.deptCode === deptCode
                  ? { ...r, status: 'acknowledged', acknowledgedAt: now(), openedAt: r.openedAt ?? now(), signature, note }
                  : r,
              ),
            },
      ),
    }))
    const dist = state.distributions.find((d) => d.id === distId)
    const doc = state.documents.find((d) => d.id === dist?.documentId)
    log('ลงนามรับทราบ', `${doc ? docCode(doc) : ''} โดย ${signature}`)
  },
}
