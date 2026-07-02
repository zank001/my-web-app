import type { DocLevel, Role } from '../types'
import type { Page } from '../components/Sidebar'

export const roleLabel: Record<Role, string> = {
  director: 'ผู้อำนวยการโรงพยาบาล',
  chair: 'ประธานคณะกรรมการ/หัวหน้ากลุ่มงาน',
  qmr: 'คณะกรรมการศูนย์คุณภาพ',
  staff: 'ผู้ใช้ทั่วไป',
}

export const roleShort: Record<Role, string> = {
  director: 'ผอ.รพ.',
  chair: 'ประธาน/หัวหน้ากลุ่มงาน',
  qmr: 'ศูนย์คุณภาพ',
  staff: 'ผู้ใช้ทั่วไป',
}

export const roleColor: Record<Role, string> = {
  director: 'bg-violet-100 text-violet-700',
  chair: 'bg-amber-100 text-amber-700',
  qmr: 'bg-brand-100 text-brand-700',
  staff: 'bg-slate-100 text-slate-600',
}

/**
 * สิทธิ์การใช้งานตามตารางผู้รับผิดชอบ QM-QMR-001-1:
 * - ตรวจสอบ (QC review): ศูนย์คุณภาพ
 * - อนุมัติ QM/SOP: ผู้อำนวยการ · อนุมัติ WI/FM: ประธานกก./หัวหน้ากลุ่มงาน (ผอ. อนุมัติได้ทุกระดับในฐานะผู้มีอำนาจสูงสุด)
 * - แจกจ่าย/เรียกคืน/ทำลาย: ศูนย์คุณภาพ (QMR)
 * - ยื่นคำขอ/ลงนามรับทราบ: ทุกระดับ
 */
export const can = {
  submitRequest: (_r: Role) => true,
  reviewRequest: (r: Role) => r === 'qmr',
  approve: (r: Role, level: DocLevel) => {
    if (r === 'director') return true
    if (r === 'chair') return level === 'WI' || level === 'FM'
    return false
  },
  distribute: (r: Role) => r === 'qmr' || r === 'director',
  acknowledge: (_r: Role) => true,
  viewAnyInbox: (r: Role) => r === 'qmr' || r === 'director',
}

/** ระดับผู้ใช้ที่เห็นได้ในแต่ละหน้า (ใช้กรองเมนูและกันเส้นทาง) */
export const pageRoles: Record<Page, Role[] | 'all'> = {
  dashboard: 'all',
  register: 'all',
  request: 'all',
  approvals: ['qmr', 'chair', 'director'],
  distribution: ['qmr', 'director'],
  inbox: 'all',
  reports: ['qmr', 'chair', 'director'],
  manual: 'all',
}

export const canSeePage = (role: Role, page: Page) => {
  const allowed = pageRoles[page]
  return allowed === 'all' || allowed.includes(role)
}
