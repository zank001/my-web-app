import type { Duty } from './types'

// ตัวช่วยเกี่ยวกับวันที่ (ปฏิทินไทย เริ่มสัปดาห์วันอาทิตย์) และการคำนวณชั่วโมงเวร

/** ชื่อวันแบบย่อ เรียงตาม getDay() 0–6 (อาทิตย์ก่อน) */
export const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

/** ชื่อวันแบบเต็ม เรียงตาม getDay() 0–6 */
export const THAI_DAYS_FULL = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์',
]

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const pad = (n: number) => String(n).padStart(2, '0')

/** จำนวนวันในเดือน (month 0-indexed) */
export const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

/** วันในสัปดาห์ของวันที่ 1 ของเดือน (0=อาทิตย์) ใช้เว้นช่องนำหน้าปฏิทิน */
export const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

/** สร้างคีย์วันที่รูปแบบ yyyy-mm-dd (month 0-indexed) */
export const formatDateKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`

/** เช่น "กรกฎาคม 2569" (พ.ศ.) — month 0-indexed */
export const getThaiMonthYear = (year: number, month: number) => `${THAI_MONTHS[month]} ${year + 543}`

/** เช่น "7 กรกฎาคม 2569" จากคีย์ yyyy-mm-dd */
export const getThaiDateString = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** จำนวนชั่วโมงระหว่างเวลาสองจุด รองรับข้ามเที่ยงคืน (เช่น 16:30–08:30) */
const hoursBetween = (start: string, end: string) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

/** ชั่วโมงของเวรตามประเภท — เช้า 8 ชม., บ่าย 4 ชม., Oncall/พิเศษ คำนวณจากเวลาที่บันทึก */
export const calculateDutyHoursByShift = (duty: Duty): number => {
  switch (duty.shiftId) {
    case 'morning':
      return 8
    case 'afternoon':
      return 4
    case 'oncall':
      return hoursBetween(duty.oncallStartTime || '16:30', duty.oncallEndTime || '08:30')
    case 'special':
      return hoursBetween(duty.specialStartTime || '08:30', duty.specialEndTime || '12:00')
    default:
      return 0
  }
}
