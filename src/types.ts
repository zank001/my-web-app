export type DocumentType =
  | 'policy'        // นโยบาย
  | 'procedure'     // ระเบียบปฏิบัติ
  | 'work_instruction' // วิธีปฏิบัติงาน (WI)
  | 'form'          // แบบฟอร์ม
  | 'manual'        // คู่มือ
  | 'announcement'  // ประกาศ
  | 'external'      // เอกสารภายนอก

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'distributed' | 'obsolete'

export type Priority = 'normal' | 'urgent' | 'critical'

export interface Department {
  id: string
  code: string         // เช่น OPD, IPD, LAB
  nameTh: string
  nameEn: string
  head: string         // หัวหน้าหน่วยงาน
  email: string
  memberCount: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'qmr' | 'dept_head' | 'staff' | 'admin'
  departmentId: string
  avatarUrl?: string
}

export interface QualityDocument {
  id: string
  code: string              // เช่น QP-IPD-001
  title: string
  type: DocumentType
  version: string           // เช่น 02
  effectiveDate: string     // ISO
  reviewDate: string
  status: DocumentStatus
  priority: Priority
  ownerDepartmentId: string
  authorId: string
  approverId?: string
  fileName: string
  fileSize: number          // bytes
  pageCount?: number
  summary: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type AckStatus = 'pending' | 'opened' | 'acknowledged' | 'overdue'

export interface Distribution {
  id: string
  documentId: string
  sentById: string          // QMR user
  sentAt: string
  dueAt: string
  message: string
  recipients: DistributionRecipient[]
  channels: Array<'email' | 'in_app' | 'line'>
}

export interface DistributionRecipient {
  departmentId: string
  userId?: string           // optional individual target
  status: AckStatus
  openedAt?: string
  acknowledgedAt?: string
  signature?: string        // ผู้ลงนามรับทราบ
  note?: string
}

export interface Activity {
  id: string
  at: string
  actorId: string
  actorName: string
  action: string
  target: string
}
