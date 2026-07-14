// Domain model ตามคู่มือคุณภาพ QM-QMR-001-1
// "การจัดทำและควบคุมเอกสารคุณภาพ" ศูนย์คุณภาพ โรงพยาบาลปาย

/** ระดับเอกสารคุณภาพ 4 ระดับ + เอกสารภายนอก (ข้อ 4.5) */
export type DocLevel = 'QM' | 'SOP' | 'WI' | 'FM' | 'EXT'

/**
 * วงจรเอกสาร (ข้อ 6): ร่าง → ศูนย์คุณภาพตรวจสอบ → ผู้มีอำนาจอนุมัติ →
 * เอกสารควบคุม → ยกเลิก (เก็บ 1 ปีแล้วทำลาย)
 */
export type DocumentStatus =
  | 'draft'
  | 'pending_review'    // รอศูนย์คุณภาพตรวจสอบ
  | 'pending_approval'  // รอผู้มีอำนาจลงนาม
  | 'controlled'        // ประทับตรา "เอกสารควบคุม" แล้ว
  | 'cancelled'         // ประทับตรา "ยกเลิก" เก็บรอทำลาย

export type DeptGroup = 'ศูนย์คุณภาพ' | 'คณะกรรมการ' | 'กลุ่มงาน' | 'องค์กร' | 'งานการพยาบาล'

/** หน่วยงาน/คณะกรรมการ ตามตารางอักษรย่อในภาคผนวก QM-QMR-001-1 หน้า 7 */
export interface Department {
  code: string          // เช่น QMR, PCT, OPD
  nameTh: string
  group: DeptGroup
}

/**
 * ระดับผู้ใช้ อิงตารางผู้รับผิดชอบใน QM-QMR-001-1 หน้า 8 (+ ผู้ดูแลระบบ)
 * - admin    : ผู้ดูแลระบบ (สิทธิ์สูงสุด — แก้ไข/ลบเอกสาร และทำได้ทุกอย่าง)
 * - director : ผู้อำนวยการโรงพยาบาล (อนุมัติ QM/SOP และเป็นผู้มีอำนาจสูงสุด)
 * - chair    : ประธานคณะกรรมการ/หัวหน้ากลุ่มงาน (อนุมัติ WI/FM)
 * - qmr      : คณะกรรมการศูนย์คุณภาพ (ตรวจสอบ แจกจ่าย เรียกคืน ทำลาย)
 * - staff    : ผู้ใช้ทั่วไป (ยื่นคำขอ ดูเอกสาร ลงนามรับทราบ)
 */
export type Role = 'admin' | 'director' | 'chair' | 'qmr' | 'staff'

export interface User {
  id: string
  name: string
  position: string      // ตำแหน่ง เช่น เภสัชกร, ผู้อำนวยการโรงพยาบาล
  email: string
  role: Role
  deptCode: string
}

export interface RevisionEntry {
  date: string          // ISO
  revision: number
  note: string          // บันทึกการแก้ไข
}

/**
 * เอกสารคุณภาพ — รหัสตามระบบ AAA-BBB-XXX-YY (ข้อ 5)
 * AAA=ระดับ, BBB=หน่วยงาน, XXX=ลำดับที่ 3 หลัก, YY=ครั้งที่แก้ไข
 */
export interface QualityDocument {
  id: string
  level: DocLevel
  deptCode: string
  seq: number           // XXX
  revision: number      // YY
  title: string
  status: DocumentStatus
  effectiveDate: string
  preparedBy: string    // ผู้จัดทำ
  reviewedBy: string    // ผู้ทบทวน/ตรวจสอบ
  approvedBy: string    // ผู้อนุมัติ
  fileName: string
  pageCount?: number
  summary: string
  revisionLog: RevisionEntry[]
  cancelledAt?: string
  destroyAfter?: string // ยกเลิกแล้วเก็บ 1 ปี นับจากวันยกเลิก (ข้อ 6.4)
  isMaster?: boolean    // เอกสารแม่บทควบคุมเอกสารอื่น (QM-QMR-001)
}

/** ใบขอขึ้นทะเบียนใหม่/ปรับปรุงแก้ไข/ยกเลิก — FM-QMR-001-01 */
export type RequestKind = 'new' | 'revise' | 'cancel'
export type RequestStatus =
  | 'submitted'    // ผู้เสนอส่งคำขอ
  | 'needs_fix'    // ศูนย์คุณภาพตรวจแล้วต้องแก้ไข
  | 'reviewed'     // ตรวจสอบผ่าน รอผู้มีอำนาจอนุมัติ
  | 'approved'
  | 'rejected'

export interface DocRequest {
  id: string
  kind: RequestKind
  level: DocLevel
  deptCode: string
  title: string
  reason: string          // เหตุผลการจัดทำหรือแก้ไข
  targetDocId?: string    // กรณี revise/cancel
  proposer: string
  proposerPosition: string
  submittedAt: string
  status: RequestStatus
  qcComment?: string      // ความเห็นศูนย์คุณภาพ
  qcBy?: string
  decidedAt?: string
  decidedBy?: string
}

export type AckStatus = 'pending' | 'opened' | 'acknowledged' | 'overdue'

/** ชุดการแจกจ่ายเอกสารควบคุม — ผู้แจกจ่าย/เรียกคืน คือ QMR ทุกระดับเอกสาร */
export interface Distribution {
  id: string
  documentId: string
  sentBy: string
  sentAt: string
  dueAt: string
  message: string
  channels: Array<'email' | 'in_app' | 'line'>
  recipients: DistributionRecipient[]
}

export interface DistributionRecipient {
  deptCode: string
  status: AckStatus
  openedAt?: string
  acknowledgedAt?: string
  signature?: string
  note?: string
}

export interface Activity {
  id: string
  at: string
  actorName: string
  action: string
  target: string
}
