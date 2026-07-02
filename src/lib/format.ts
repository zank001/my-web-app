import type { DocLevel, DocumentStatus, QualityDocument, RequestKind, RequestStatus } from '../types'

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60_000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} วันที่แล้ว`
  return formatDate(iso)
}

/** รหัสเอกสารตามระบบ AAA-BBB-XXX-YY (QM-QMR-001-1 ข้อ 5) */
export const docCode = (d: Pick<QualityDocument, 'level' | 'deptCode' | 'seq' | 'revision'>) =>
  `${d.level}-${d.deptCode}-${String(d.seq).padStart(3, '0')}-${d.revision}`

export const levelLabel: Record<DocLevel, string> = {
  QM: 'คู่มือคุณภาพ (Quality Manual)',
  SOP: 'แนวทางปฏิบัติ (SOP)',
  WI: 'วิธีปฏิบัติงาน (WI)',
  FM: 'แบบฟอร์ม (Form)',
  EXT: 'เอกสารภายนอก (External)',
}

export const levelShort: Record<DocLevel, string> = {
  QM: 'QM', SOP: 'SOP', WI: 'WI', FM: 'FM', EXT: 'EXT',
}

/** ระดับเอกสาร 1-4 ตามข้อ 4.5 (EXT = เอกสารภายนอก ไม่นับระดับ) */
export const levelTier: Record<DocLevel, string> = {
  QM: 'ระดับที่ 1', SOP: 'ระดับที่ 2', WI: 'ระดับที่ 3', FM: 'ระดับที่ 4', EXT: 'ภายนอก',
}

export const statusLabel: Record<DocumentStatus, string> = {
  draft: 'ฉบับร่าง',
  pending_review: 'รอศูนย์คุณภาพตรวจสอบ',
  pending_approval: 'รอผู้มีอำนาจลงนาม',
  controlled: 'เอกสารควบคุม',
  cancelled: 'ยกเลิก (รอทำลาย)',
}

export const requestKindLabel: Record<RequestKind, string> = {
  new: 'ขึ้นทะเบียนใหม่',
  revise: 'ปรับปรุงแก้ไข',
  cancel: 'ยกเลิกเอกสาร',
}

export const requestStatusLabel: Record<RequestStatus, string> = {
  submitted: 'รอตรวจสอบ',
  needs_fix: 'ต้องแก้ไขเอกสาร',
  reviewed: 'ตรวจสอบผ่าน รออนุมัติ',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
}

export const ackLabel: Record<string, string> = {
  pending: 'รอเปิดอ่าน',
  opened: 'เปิดอ่านแล้ว',
  acknowledged: 'รับทราบแล้ว',
  overdue: 'เกินกำหนด',
}

/**
 * ตารางผู้รับผิดชอบจัดทำ/ตรวจสอบ/อนุมัติ ตาม QM-QMR-001-1 หน้า 8
 * ผู้แจกจ่าย/เรียกคืน/ทำลาย: QMR ทุกระดับ
 */
export const approvalMatrix: Record<Exclude<DocLevel, 'EXT'>, { prepare: string; review: string; approve: string }> = {
  QM:  { prepare: 'ผู้อำนวยการ/QMR',      review: 'ผู้อำนวยการ',                 approve: 'ผู้อำนวยการ' },
  SOP: { prepare: 'คณะกรรมการ/หน่วยงาน', review: 'QMR/PCT',                    approve: 'ผู้อำนวยการ' },
  WI:  { prepare: 'คณะกรรมการ/หน่วยงาน', review: 'QMR/PCT/หัวหน้ากลุ่มงาน',     approve: 'ประธานคณะกรรมการ/หัวหน้ากลุ่มงาน' },
  FM:  { prepare: 'คณะกรรมการ/หน่วยงาน', review: 'QMR/PCT/หัวหน้ากลุ่มงาน',     approve: 'ประธานคณะกรรมการ/หัวหน้ากลุ่มงาน' },
}
