import type { DocLevel, Role } from '../types'
import type { Page } from '../components/Sidebar'

export const roleLabel: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  director: 'ผู้อำนวยการโรงพยาบาล',
  chair: 'ประธานคณะกรรมการ/หัวหน้ากลุ่มงาน',
  qmr: 'คณะกรรมการศูนย์คุณภาพ',
  staff: 'ผู้ใช้ทั่วไป',
}

export const roleShort: Record<Role, string> = {
  admin: 'ผู้ดูแลระบบ',
  director: 'ผอ.รพ.',
  chair: 'ประธาน/หัวหน้ากลุ่มงาน',
  qmr: 'ศูนย์คุณภาพ',
  staff: 'ผู้ใช้ทั่วไป',
}

export const roleColor: Record<Role, string> = {
  admin: 'bg-rose-100 text-rose-700',
  director: 'bg-violet-100 text-violet-700',
  chair: 'bg-amber-100 text-amber-700',
  qmr: 'bg-brand-100 text-brand-700',
  staff: 'bg-slate-100 text-slate-600',
}

/**
 * สิทธิ์การใช้งานตามตารางผู้รับผิดชอบ QM-QMR-001-1 (ผู้ดูแลระบบ = สิทธิ์เต็ม):
 * - ตรวจสอบ (QC review): ศูนย์คุณภาพ
 * - อนุมัติ QM/SOP: ผู้อำนวยการ · อนุมัติ WI/FM: ประธานกก./หัวหน้ากลุ่มงาน (ผอ. อนุมัติได้ทุกระดับในฐานะผู้มีอำนาจสูงสุด)
 * - แจกจ่าย/เรียกคืน/ทำลาย: ศูนย์คุณภาพ (QMR)
 * - แก้ไข/ลบเอกสารในทะเบียน: ผู้ดูแลระบบ (admin)
 * - ยื่นคำขอ/ลงนามรับทราบ: ทุกระดับ
 */
export const can = {
  submitRequest: (_r: Role) => true,
  reviewRequest: (r: Role) => r === 'qmr' || r === 'admin',
  approve: (r: Role, level: DocLevel) => {
    if (r === 'admin' || r === 'director') return true
    if (r === 'chair') return level === 'WI' || level === 'FM'
    return false
  },
  distribute: (r: Role) => r === 'qmr' || r === 'director' || r === 'admin',
  acknowledge: (_r: Role) => true,
  viewAnyInbox: (r: Role) => r === 'qmr' || r === 'director' || r === 'admin',
  /** แก้ไข/ลบเอกสารในทะเบียนโดยตรง (นอกวงจรคำขอ) — เฉพาะผู้ดูแลระบบ */
  manageDocuments: (r: Role) => r === 'admin',
}

/** ระดับผู้ใช้ที่เห็นได้ในแต่ละหน้า (ใช้กรองเมนูและกันเส้นทาง) — admin เห็นทุกหน้า */
export const pageRoles: Record<Page, Role[] | 'all'> = {
  dashboard: 'all',
  register: 'all',
  request: 'all',
  studio: 'all',
  approvals: ['qmr', 'chair', 'director', 'admin'],
  distribution: ['qmr', 'director', 'admin'],
  inbox: 'all',
  reports: ['qmr', 'chair', 'director', 'admin'],
  manual: 'all',
  cloud: ['qmr', 'director', 'admin'],
}

export const canSeePage = (role: Role, page: Page) => {
  const allowed = pageRoles[page]
  return allowed === 'all' || allowed.includes(role)
}
