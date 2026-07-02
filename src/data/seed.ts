import type {
  Activity,
  Department,
  Distribution,
  QualityDocument,
  User,
} from '../types'

export const departments: Department[] = [
  { id: 'd-opd', code: 'OPD', nameTh: 'ผู้ป่วยนอก', nameEn: 'Out-Patient Dept.', head: 'นพ.สมชาย ใจดี', email: 'opd@hospital.go.th', memberCount: 42 },
  { id: 'd-ipd', code: 'IPD', nameTh: 'ผู้ป่วยใน', nameEn: 'In-Patient Dept.', head: 'พญ.รัตนา ศรีสุข', email: 'ipd@hospital.go.th', memberCount: 68 },
  { id: 'd-er',  code: 'ER',  nameTh: 'อุบัติเหตุฉุกเฉิน', nameEn: 'Emergency Room', head: 'นพ.วีระ บุญมา', email: 'er@hospital.go.th', memberCount: 35 },
  { id: 'd-lab', code: 'LAB', nameTh: 'ห้องปฏิบัติการ', nameEn: 'Laboratory', head: 'ทนพ.อรอนงค์ พุ่มพวง', email: 'lab@hospital.go.th', memberCount: 18 },
  { id: 'd-phar',code: 'PHAR',nameTh: 'เภสัชกรรม', nameEn: 'Pharmacy', head: 'ภก.ธนากร เกษมสุข', email: 'pharmacy@hospital.go.th', memberCount: 22 },
  { id: 'd-rad', code: 'RAD', nameTh: 'รังสีวิทยา', nameEn: 'Radiology', head: 'นพ.ปกรณ์ แสนดี', email: 'radiology@hospital.go.th', memberCount: 12 },
  { id: 'd-ipc', code: 'IPC', nameTh: 'ป้องกันและควบคุมการติดเชื้อ', nameEn: 'Infection Prevention & Control', head: 'พว.มาลี ใจเย็น', email: 'ipc@hospital.go.th', memberCount: 6 },
  { id: 'd-rm',  code: 'RM',  nameTh: 'บริหารความเสี่ยง', nameEn: 'Risk Management', head: 'พว.จันทร์เพ็ญ สุขสันต์', email: 'rm@hospital.go.th', memberCount: 4 },
  { id: 'd-or',  code: 'OR',  nameTh: 'ห้องผ่าตัด', nameEn: 'Operating Room', head: 'พว.พรพิมล มั่นใจ', email: 'or@hospital.go.th', memberCount: 24 },
  { id: 'd-icu', code: 'ICU', nameTh: 'หอผู้ป่วยวิกฤต', nameEn: 'Intensive Care Unit', head: 'พญ.อรุณี รุ่งโรจน์', email: 'icu@hospital.go.th', memberCount: 28 },
]

export const users: User[] = [
  { id: 'u-qmr',   name: 'พญ.สุภาวดี ทองคำ',  email: 'qmr@hospital.go.th',   role: 'qmr',       departmentId: 'd-rm' },
  { id: 'u-opd',   name: 'นพ.สมชาย ใจดี',     email: 'opd.head@hospital.go.th', role: 'dept_head', departmentId: 'd-opd' },
  { id: 'u-ipd',   name: 'พญ.รัตนา ศรีสุข',    email: 'ipd.head@hospital.go.th', role: 'dept_head', departmentId: 'd-ipd' },
  { id: 'u-staff1',name: 'พว.วรรณา สดใส',     email: 'wanna@hospital.go.th',    role: 'staff',     departmentId: 'd-ipd' },
  { id: 'u-admin', name: 'ผู้ดูแลระบบ',         email: 'admin@hospital.go.th',    role: 'admin',     departmentId: 'd-rm' },
]

const today = new Date()
const iso = (offsetDays: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

export const documents: QualityDocument[] = [
  {
    id: 'doc-001', code: 'QP-IPC-001', title: 'แนวทางการป้องกันการติดเชื้อในโรงพยาบาล ฉบับปรับปรุง',
    type: 'procedure', version: '03', effectiveDate: iso(-5), reviewDate: iso(360),
    status: 'distributed', priority: 'critical',
    ownerDepartmentId: 'd-ipc', authorId: 'u-qmr', approverId: 'u-qmr',
    fileName: 'QP-IPC-001_v03.pdf', fileSize: 2_148_572, pageCount: 24,
    summary: 'ปรับปรุงขั้นตอนการล้างมือ ๗ ขั้นตอน, การใช้ PPE ตามระดับความเสี่ยง, และแนวทางการแยกผู้ป่วย',
    tags: ['IPC', 'HA', 'PPE'],
    createdAt: iso(-30), updatedAt: iso(-5),
  },
  {
    id: 'doc-002', code: 'WI-OPD-014', title: 'วิธีปฏิบัติงานคัดกรองผู้ป่วยที่ห้องบัตร',
    type: 'work_instruction', version: '02', effectiveDate: iso(-2), reviewDate: iso(180),
    status: 'distributed', priority: 'urgent',
    ownerDepartmentId: 'd-opd', authorId: 'u-opd',
    fileName: 'WI-OPD-014_v02.pdf', fileSize: 845_120, pageCount: 8,
    summary: 'เพิ่มขั้นตอนการคัดแยกผู้ป่วยที่มีอาการทางเดินหายใจตามแนวทางใหม่',
    tags: ['OPD', 'Triage'],
    createdAt: iso(-10), updatedAt: iso(-2),
  },
  {
    id: 'doc-003', code: 'PO-RM-007', title: 'นโยบายการรายงานอุบัติการณ์ความเสี่ยง',
    type: 'policy', version: '01', effectiveDate: iso(-15), reviewDate: iso(700),
    status: 'distributed', priority: 'normal',
    ownerDepartmentId: 'd-rm', authorId: 'u-qmr',
    fileName: 'PO-RM-007_v01.pdf', fileSize: 1_204_889, pageCount: 12,
    summary: 'กำหนดให้รายงานอุบัติการณ์ภายใน 24 ชม. ผ่านระบบ HRMS',
    tags: ['RM', 'Incident'],
    createdAt: iso(-40), updatedAt: iso(-15),
  },
  {
    id: 'doc-004', code: 'FM-PHAR-021', title: 'แบบฟอร์มขอใช้ยานอกบัญชี',
    type: 'form', version: '04', effectiveDate: iso(1), reviewDate: iso(365),
    status: 'approved', priority: 'normal',
    ownerDepartmentId: 'd-phar', authorId: 'u-qmr',
    fileName: 'FM-PHAR-021_v04.pdf', fileSize: 312_004, pageCount: 2,
    summary: 'แก้ไขช่องลายเซ็นแพทย์เจ้าของไข้และเภสัชกรหัวหน้าเวร',
    tags: ['PHAR', 'Form'],
    createdAt: iso(-3), updatedAt: iso(-1),
  },
  {
    id: 'doc-005', code: 'MN-LAB-003', title: 'คู่มือการเก็บสิ่งส่งตรวจทางห้องปฏิบัติการ',
    type: 'manual', version: '05', effectiveDate: iso(-60), reviewDate: iso(300),
    status: 'distributed', priority: 'normal',
    ownerDepartmentId: 'd-lab', authorId: 'u-qmr',
    fileName: 'MN-LAB-003_v05.pdf', fileSize: 5_421_998, pageCount: 56,
    summary: 'ปรับปรุงรหัสหลอด เพิ่มรายการตรวจใหม่ และอุณหภูมิการเก็บรักษา',
    tags: ['LAB', 'Specimen'],
    createdAt: iso(-90), updatedAt: iso(-60),
  },
  {
    id: 'doc-006', code: 'AN-QMR-2026-04', title: 'ประกาศ: ตารางตรวจติดตามคุณภาพภายใน ไตรมาส 3',
    type: 'announcement', version: '01', effectiveDate: iso(0), reviewDate: iso(90),
    status: 'distributed', priority: 'urgent',
    ownerDepartmentId: 'd-rm', authorId: 'u-qmr',
    fileName: 'AN-QMR-2026-04.pdf', fileSize: 188_220, pageCount: 3,
    summary: 'แจ้งตารางการตรวจติดตามภายใน (Internal Audit) ระหว่าง 1-15 ก.ค. 2026',
    tags: ['Audit', 'HA'],
    createdAt: iso(0), updatedAt: iso(0),
  },
]

export const distributions: Distribution[] = [
  {
    id: 'dist-001', documentId: 'doc-001', sentById: 'u-qmr', sentAt: iso(-5), dueAt: iso(2),
    message: 'ขอให้ทุกหน่วยรับทราบและถ่ายทอดให้บุคลากรในสังกัดภายใน 7 วัน',
    channels: ['email', 'in_app'],
    recipients: [
      { departmentId: 'd-opd', status: 'acknowledged', openedAt: iso(-4), acknowledgedAt: iso(-3), signature: 'นพ.สมชาย ใจดี' },
      { departmentId: 'd-ipd', status: 'acknowledged', openedAt: iso(-5), acknowledgedAt: iso(-4), signature: 'พญ.รัตนา ศรีสุข' },
      { departmentId: 'd-er',  status: 'opened',       openedAt: iso(-2) },
      { departmentId: 'd-lab', status: 'pending' },
      { departmentId: 'd-icu', status: 'acknowledged', openedAt: iso(-4), acknowledgedAt: iso(-3), signature: 'พญ.อรุณี รุ่งโรจน์' },
      { departmentId: 'd-or',  status: 'overdue' },
    ],
  },
  {
    id: 'dist-002', documentId: 'doc-002', sentById: 'u-qmr', sentAt: iso(-2), dueAt: iso(5),
    message: 'แจ้งหน่วย OPD และจุดคัดกรอง',
    channels: ['email', 'in_app'],
    recipients: [
      { departmentId: 'd-opd', status: 'acknowledged', openedAt: iso(-2), acknowledgedAt: iso(-1), signature: 'นพ.สมชาย ใจดี' },
      { departmentId: 'd-er',  status: 'opened', openedAt: iso(-1) },
    ],
  },
  {
    id: 'dist-003', documentId: 'doc-006', sentById: 'u-qmr', sentAt: iso(0), dueAt: iso(7),
    message: 'ขอให้ทุกหน่วยเตรียมเอกสารตามรายการแนบและยืนยันการเข้าร่วม',
    channels: ['email', 'in_app', 'line'],
    recipients: departments.map((d) => ({ departmentId: d.id, status: 'pending' as const })),
  },
]

export const activities: Activity[] = [
  { id: 'a1', at: iso(0),  actorId: 'u-qmr', actorName: 'พญ.สุภาวดี', action: 'ส่งเอกสาร', target: 'AN-QMR-2026-04 → ทุกหน่วยงาน' },
  { id: 'a2', at: iso(-1), actorId: 'u-opd', actorName: 'นพ.สมชาย',  action: 'รับทราบเอกสาร', target: 'WI-OPD-014 v02' },
  { id: 'a3', at: iso(-2), actorId: 'u-ipd', actorName: 'พญ.รัตนา',  action: 'รับทราบเอกสาร', target: 'QP-IPC-001 v03' },
  { id: 'a4', at: iso(-3), actorId: 'u-qmr', actorName: 'พญ.สุภาวดี', action: 'อนุมัติเอกสาร', target: 'FM-PHAR-021 v04' },
  { id: 'a5', at: iso(-5), actorId: 'u-qmr', actorName: 'พญ.สุภาวดี', action: 'ส่งเอกสาร', target: 'QP-IPC-001 → 6 หน่วยงาน' },
]
