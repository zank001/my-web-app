import type { AppSettings, Holiday, Staff } from './types'

// ข้อมูลตั้งต้นสำหรับสาธิต (กลุ่มงานเภสัชกรรม โรงพยาบาลปาย) — แก้ไขได้ทั้งหมด
// และถูกบันทึกลง localStorage โดยอัตโนมัติ

export const defaultSettings = (): AppSettings => ({
  hospitalInfo: {
    hospitalName: 'โรงพยาบาลปาย',
    departmentName: 'ฝ่ายเภสัชกรรม',
    bossName: 'นายดิถี เหลืองธนะโภค',
    bossTitle: 'หัวหน้าฝ่ายเภสัชกรรม',
  },
  appearance: { themeColor: 'sky', fontSize: 'medium' },
  signatures: { scheduler: '', approver: '' },
  shiftRates: {
    pharmacist: 60,
    technician: 45,
    aide: 30,
    nurse: 60,
    doctor: 120,
    dentist: 120,
    medicalTech: 50,
    radiologist: 50,
    generalAdmin: 30,
    other: 30,
  },
  shiftTimes: {
    morning: { start: '08:30', end: '16:30' },
    afternoon: { start: '16:30', end: '20:00' },
    oncall: { start: '16:30', end: '08:30' },
    special: { start: '08:30', end: '12:00' },
  },
  departments: [
    { id: 'dept-pharmacy', name: 'ฝ่ายเภสัชกรรม (ภาพรวม)' },
    { id: 'dept-opd', name: 'งานจ่ายยาผู้ป่วยนอก (OPD)' },
    { id: 'dept-ipd', name: 'งานจ่ายยาผู้ป่วยใน (IPD)' },
  ],
})

// ใช้ id เป็นเลขลำดับเพื่อให้เรียงในไฟล์สรุปได้สวยงาม (SummaryView เรียงตาม parseInt(id))
export const seedStaff: Staff[] = [
  { id: '1', name: 'ภญ. สมหญิง ใจดี',   nickname: 'หญิง', type: 'pharmacist', color: '#2563eb', oncallOnly: true,  defaultDays: [1, 4], departmentId: 'dept-pharmacy', signature: '' },
  { id: '2', name: 'ภก. ปิยะ มั่นคง',    nickname: 'ปิยะ', type: 'pharmacist', color: '#7c3aed', oncallOnly: true,  defaultDays: [2, 5], departmentId: 'dept-pharmacy', signature: '' },
  { id: '3', name: 'นาง อรุณี แสงทอง',   nickname: 'อร',   type: 'technician', color: '#16a34a', oncallOnly: false, defaultDays: [1, 3, 5], departmentId: 'dept-pharmacy', signature: '' },
  { id: '4', name: 'นาย ณัฐพล ก้าวหน้า', nickname: 'นัท',  type: 'technician', color: '#db2777', oncallOnly: false, defaultDays: [2, 4, 6], departmentId: 'dept-pharmacy', signature: '' },
  { id: '5', name: 'นาง วิภา ทองแท้',     nickname: 'ภา',   type: 'aide',       color: '#0891b2', oncallOnly: false, defaultDays: [0, 6], departmentId: 'dept-pharmacy', signature: '' },
  { id: '6', name: 'นาย ธนา รุ่งเรือง',   nickname: 'ธน',   type: 'aide',       color: '#ea580c', oncallOnly: false, defaultDays: [3, 0], departmentId: 'dept-pharmacy', signature: '' },
]

// วันหยุดนักขัตฤกษ์ตัวอย่าง (พ.ศ. 2569 / ค.ศ. 2026)
export const seedHolidays: Holiday[] = [
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา ร.10', multiplier: 2 },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ', multiplier: 1.5 },
  { date: '2026-10-13', name: 'วันนวมินทรมหาราช', multiplier: 1.5 },
  { date: '2026-12-05', name: 'วันชาติ / วันพ่อแห่งชาติ', multiplier: 1.5 },
]
