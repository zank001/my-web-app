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
  currentUserId: string
  users: User[]
  departments: Department[]
  documents: QualityDocument[]
  requests: DocRequest[]
  distributions: Distribution[]
  activities: Activity[]
}

let state: State = {
  currentUserId: 'u-patiphan',
  users: seedUsers,
  departments: seedDepartments,
  documents: seedDocuments,
  requests: seedRequests,
  distributions: seedDistributions,
  activities: seedActivities,
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// selector ต้องคืนค่า reference เดิมเมื่อ state ไม่เปลี่ยน — ห้าม .map/.filter ในนี้
export const useStore = <T,>(selector: (s: State) => T): T =>
  useSyncExternalStore(subscribe, () => selector(state))

const update = (mut: (s: State) => State) => {
  state = mut(state)
  emit()
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
