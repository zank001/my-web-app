import type { Shift, Staff } from './types'

// ข้อมูลตัวอย่างสำหรับสาธิต — กลุ่มงานการพยาบาล (เดโม)
// ผู้ใช้แก้ไข/เพิ่ม/ลบได้ทั้งหมด และข้อมูลจะถูกบันทึกไว้ใน localStorage

export const seedStaff: Staff[] = [
  { id: 'st-1', name: 'สมหญิง ใจดี',     role: 'พยาบาลวิชาชีพ', color: '#2f8fff', maxPerWeek: 5, unavailableWeekdays: [0], active: true },
  { id: 'st-2', name: 'อรุณี แสงทอง',    role: 'พยาบาลวิชาชีพ', color: '#16a34a', maxPerWeek: 5, unavailableWeekdays: [], active: true },
  { id: 'st-3', name: 'ปิยะ มั่นคง',      role: 'พยาบาลวิชาชีพ', color: '#f59e0b', maxPerWeek: 5, unavailableWeekdays: [6], active: true },
  { id: 'st-4', name: 'ณัฐพล ก้าวหน้า',   role: 'พยาบาลวิชาชีพ', color: '#db2777', maxPerWeek: 6, unavailableWeekdays: [], active: true },
  { id: 'st-5', name: 'กมล ศรีสุข',       role: 'ผู้ช่วยพยาบาล', color: '#7c3aed', maxPerWeek: 6, unavailableWeekdays: [3], active: true },
  { id: 'st-6', name: 'วิภา ทองแท้',      role: 'ผู้ช่วยพยาบาล', color: '#0891b2', maxPerWeek: 6, unavailableWeekdays: [], active: true },
  { id: 'st-7', name: 'ธนา รุ่งเรือง',    role: 'ผู้ช่วยเหลือคนไข้', color: '#dc2626', maxPerWeek: 6, unavailableWeekdays: [], active: true },
]

export const seedShifts: Shift[] = [
  { id: 'sh-morning', name: 'เวรเช้า', start: '08:00', end: '16:00', color: '#f59e0b', required: 2, order: 1 },
  { id: 'sh-evening', name: 'เวรบ่าย', start: '16:00', end: '24:00', color: '#2f8fff', required: 2, order: 2 },
  { id: 'sh-night',   name: 'เวรดึก', start: '00:00', end: '08:00', color: '#7c3aed', required: 1, order: 3 },
]
