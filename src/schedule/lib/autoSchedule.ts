import type { AppSettings, Duty, Holiday, Staff } from '../types'
import { formatDateKey, getDaysInMonth } from '../utils'
import { genId } from '../store'

/**
 * จัดตารางเวรอัตโนมัติจาก "วันเวรประจำสัปดาห์" (defaultDays) ของบุคลากรแต่ละคน
 *
 * กติกา:
 *  - จัดเฉพาะบุคลากรในหน่วยงานที่เลือก และเฉพาะวันที่ตรงกับ defaultDays ของเขา
 *  - บุคลากรที่เป็น Oncall Only → ลงกะ Oncall, คนอื่น → เวรบ่ายในวันราชการ
 *    และเวรเช้าในวันหยุด/เสาร์–อาทิตย์ (สอดคล้องกับค่าเริ่มต้นในหน้าจัดเวรรายวัน)
 *  - ไม่สร้างซ้ำ ถ้ามีเวรของคน+วัน+กะ+หน่วยงานเดียวกันอยู่แล้ว
 *
 * คืนค่าเฉพาะ "เวรใหม่" ที่ต้องเพิ่ม (ผู้เรียกนำไปต่อท้ายรายการเดิม)
 */
export function generateAutoDuties(
  year: number,
  month: number,
  deptStaff: Staff[],
  holidays: Holiday[],
  settings: AppSettings,
  existingDuties: Duty[],
  departmentId: string,
): Duty[] {
  const holidaySet = new Set(holidays.map((h) => h.date))
  const daysInMonth = getDaysInMonth(year, month)

  // ชุดคีย์ของเวรที่มีอยู่แล้ว เพื่อกันซ้ำ
  const existingKeys = new Set(
    existingDuties.map((d) => `${d.date}__${d.staffId}__${d.shiftId}`),
  )

  const added: Duty[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateKey(year, month, day)
    const weekday = new Date(dateStr + 'T00:00:00').getDay()
    const isOffDay = weekday === 0 || weekday === 6 || holidaySet.has(dateStr)

    for (const s of deptStaff) {
      if (!s.defaultDays.includes(weekday)) continue

      const shiftId = s.oncallOnly ? 'oncall' : isOffDay ? 'morning' : 'afternoon'
      const key = `${dateStr}__${s.id}__${shiftId}`
      if (existingKeys.has(key)) continue
      existingKeys.add(key)

      const duty: Duty = {
        id: genId(),
        date: dateStr,
        staffId: s.id,
        shiftId,
        departmentId,
      }
      if (shiftId === 'oncall') {
        duty.oncallStartTime = settings.shiftTimes.oncall.start
        duty.oncallEndTime = settings.shiftTimes.oncall.end
      }
      added.push(duty)
    }
  }

  return added
}
