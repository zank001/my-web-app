// โมเดลข้อมูลของแอปจัดตารางเวรบุคลากร (Staff Duty Roster)
// ออกแบบให้ใช้กับกลุ่มงาน/หน่วยงานในโรงพยาบาล — จัดคนลงเวรตามวันและช่วงเวร

/** บุคลากรที่ต้องจัดเข้าเวร */
export interface Staff {
  id: string
  name: string
  role: string              // ตำแหน่ง เช่น พยาบาลวิชาชีพ, เภสัชกร, ผู้ช่วยเหลือคนไข้
  color: string             // สีประจำตัว (hex) ใช้แสดงในตาราง
  maxPerWeek: number        // จำนวนเวรสูงสุดต่อสัปดาห์ (ใช้ตอนจัดเวรอัตโนมัติ)
  unavailableWeekdays: number[] // วันที่ลา/ไม่สะดวก 0=อาทิตย์ … 6=เสาร์
  active: boolean           // ปิดชั่วคราวได้โดยไม่ต้องลบ (เช่น ลาคลอด/ลาศึกษา)
}

/** ช่วงเวร เช่น เวรเช้า / เวรบ่าย / เวรดึก */
export interface Shift {
  id: string
  name: string
  start: string             // "HH:MM"
  end: string               // "HH:MM"
  color: string             // hex
  required: number          // จำนวนคนที่ต้องมีในเวรนี้ต่อวัน
  order: number             // ลำดับการแสดง (เช้า→บ่าย→ดึก)
}

/**
 * ตารางเวร: map จาก "วันที่__รหัสเวร" → รายชื่อรหัสบุคลากร
 * เก็บเป็น object แบนราบเพื่อ persist ลง localStorage และค้นหา O(1)
 */
export type Assignments = Record<string, string[]>

export interface ScheduleState {
  staff: Staff[]
  shifts: Shift[]
  assignments: Assignments
  weekStart: string         // ISO date (yyyy-mm-dd) ของวันจันทร์ที่กำลังดู
}

/** คีย์ของ 1 ช่องในตาราง (วัน + เวร) */
export const cellKey = (dateISO: string, shiftId: string) => `${dateISO}__${shiftId}`

/** แยกคีย์กลับเป็นวันและเวร */
export const parseCellKey = (key: string): { date: string; shiftId: string } => {
  const i = key.indexOf('__')
  return { date: key.slice(0, i), shiftId: key.slice(i + 2) }
}
